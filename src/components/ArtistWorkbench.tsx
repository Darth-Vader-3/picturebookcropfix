import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PictureBook, BookPage, ArtFormType, Subscriber, DirectMessage, BookReview, UserFileMetadata } from '../types';
import { Sparkles, Plus, Trash2, ArrowLeft, Paintbrush, BookOpen, Layers, Check, HelpCircle, Share2, Copy, ExternalLink, MessageSquare, Send, User, Mail, Lock, Phone, ShieldCheck, Key, Settings, Camera, Palette, Eye, EyeOff, Star, Save, AlertTriangle, Loader2, Folder, Download, FileText, Image as ImageIcon, Film, UploadCloud, CheckCircle2, RefreshCw, File, Tag, Search, Filter, Clock, FileCheck, LogOut, Sun, Moon, Users, FolderArchive, Edit3, Music, ShieldAlert, XCircle } from 'lucide-react';
import { playChime, scanForInappropriateContent, maskEmail, INITIAL_BOOKS } from '../data';
import { compressImageFile, safeSetItem, safeGetItem, safeGetJSON } from '../utils/storage';
import { UserAccount } from './AuthModal';
import { registerArtistWithFirebase, updateArtistStatusInFirestore, signOutFromFirebaseAndClearSession, deleteArtistAccountFromCloudAndLocal, saveBookToFirestore, uploadArtistFileToStorage, fetchUserFilesFromFirestore, subscribeToUserFiles, downloadArtistFileFromStorage, deleteArtistFileAndSync, updateUserFileMetadataInFirestore, auth, syncProfileToFirestore, fetchProfileFromFirestore, getUserAndArtistDoc } from '../firebase';

interface ArtistWorkbenchProps {
  onPublish: (newBook: PictureBook) => void;
  onUpdate: (updatedBook: PictureBook) => void;
  onDeleteBook: (bookId: string) => Promise<void>;
  onDeleteSubscriber: (subscriberId: string) => void;
  onClose: () => void;
  onOpenBook?: (book: PictureBook) => void;
  onLogout?: () => Promise<void> | void;
  isPublishing?: boolean;
  booksList: PictureBook[];
  subscribers: Subscriber[];
  language: 'en' | 'sw';
  setLanguage: (lang: 'en' | 'sw') => void;
  userAccount?: UserAccount;
  onUpdateUserAccount?: (account: UserAccount) => void;
  directMessages?: DirectMessage[];
  bookReviews?: Record<string, BookReview[]>;
  theme?: 'day' | 'night';
  onToggleTheme?: () => void;
}

// Sample preloaded inspiration templates for artists to initialize instantly!
const INSPIRATION_TEMPLATES = [
  {
    title: "The Velvet Forest Mushroom",
    description: "An ecology and art book teaching children about velvet-soft textiles and clay fungi sculpture.",
    author: "Sonia Glass (Craft & Felt Educator)",
    accentColor: "green",
    tags: ["Mushroom", "Felt Craft", "Sculpture", "Nature"],
    pages: [
      {
        pageNumber: 1,
        title: "The Squishy Mushroom Cap",
        narrative: "Deep under the canopy of old oak trees, Sonia finds a spotted velvet mushroom. Its soft orange cap feels exactly like woolly felt! Sonia paints the outline using thick ochre oil paints. 'Mushrooms represent nature's organic architecture,' she whispers. 'Each spore is a tiny seed of creativity!'",
        artForm: "sculpture" as const,
        educationBuddyTip: "Observe this 3D Clay Mushroom! Notice the textured gill plates beneath. Drag it around to see how light shadows define the organic curves of the cap.",
        interactiveData: {
          sculptureId: "pot",
          sculptureMaterial: "clay",
          colors: ["#ea580c", "#ef4444", "#ca8a04"]
        }
      },
      {
        pageNumber: 2,
        title: "Sowing Felt Lichens",
        narrative: "To mimic the mossy forest floor, Sonia stitches green ribbons and places wood twigs. Help Sonia arrange mossy papercut trees, clay ladybugs, and brown twigs to create the cozy mushroom colony's magical garden stage!",
        artForm: "craft" as const,
        educationBuddyTip: "This is a handmade Craft Collage! Drag moss-green cutouts and clay mushrooms from the inventory tray to form an ecosystem composition.",
        interactiveData: {
          backgroundTheme: "forest",
          availablePieces: [
            { id: 'clay-mushroom', type: 'clay', name: 'Clay Shroom', emoji: '🍄', color: '#ef4444' },
            { id: 'cut-tree', type: 'papercut', name: 'Mossy Tree', emoji: '🌳', color: '#10b981' },
            { id: 'wooden-fence', type: 'collage', name: 'Wood Twigs', emoji: '🪵', color: '#a16207' },
            { id: 'felt-star', type: 'fabric', name: 'Yellow Star', emoji: '⭐', color: '#fbbf24' }
          ]
        }
      }
    ]
  },
  {
    title: "The Origami Dragon's Sky Flight",
    description: "A gorgeous Japanese paper folding tale teaching structural symmetry and paper textures.",
    author: "Hiroshi Sato (Paper Architect)",
    accentColor: "blue",
    tags: ["Origami", "Symmetry", "Slat Art", "Aerodynamics"],
    pages: [
      {
        pageNumber: 1,
        title: "Folding Golden Sunlight",
        narrative: "Hiroshi creases a square of handmade golden washi paper. Fold after fold, triangular wings emerge from the paper sheet! 'Symmetry is the heart of Origami,' Hiroshi explains. 'By bending flat objects, we capture aerodynamic lines!' Let's try coloring Hiroshi's paper diagram to see the symmetry creases!",
        artForm: "painting" as const,
        educationBuddyTip: "This is a Painting and Texturizing workshop! Rub your virtual sponge or watercolor brush to reveal Hiroshi's precise crease lines and golden dragon scales.",
        interactiveData: {
          colors: ["#fbbf24", "#ea580c", "#3b82f6", "#22c55e"],
          textures: [{ id: 'sponge', name: 'Sponge Crease', pattern: 'dotted', brushSize: 30 }]
        }
      },
      {
        pageNumber: 2,
        title: "Dancing in the Fluffy Skies",
        narrative: "Behold! The folded dragon leaps from Hiroshi's fingertips and wiggles its paper tail. Hovering clouds and papercut stars float by as it spins through the breeze!",
        artForm: "animation" as const,
        educationBuddyTip: "This uses Interactive Animations! Tap the origami dragons on the board to see them roll, jump, and scatter sparkly sky bubbles!",
        interactiveData: {
          animatableElements: [
            { id: 'dragon', label: 'Paper Dragon', emoji: '🐉', bounceType: 'spin', x: 50, y: 55 },
            { id: 'cloud', label: 'Yarn Cloud', emoji: '☁️', bounceType: 'sway', x: 25, y: 30 },
            { id: 'sun', label: 'Origami Sun', emoji: '☀️', bounceType: 'spin', x: 80, y: 20 }
          ]
        }
      }
    ]
  },
  {
    title: "The Terracotta Safari Giraffe",
    description: "An African wildlife clay sculpting journey exploring savanna ecosystems and baked terracotta art.",
    author: "Kibali Mtema (African Wildlife & Clay Artist)",
    accentColor: "terracotta",
    tags: ["Safari", "Giraffe", "Terracotta", "Clay"],
    pages: [
      {
        pageNumber: 1,
        title: "Sculpting the Gentle Giant",
        narrative: "Under the acacia shade, Kibali shapes rustic terracotta clay into a towering giraffe figurine. Notice how the long neck balances the tall legs! 'Terracotta carries the warm spirit of the African earth,' Kibali smiles.",
        artForm: "sculpture" as const,
        educationBuddyTip: "Observe this 3D Terracotta Giraffe! Drag to spin and see how light highlights the long neck and brown patch patterns.",
        interactiveData: {
          sculptureId: "giraffe",
          sculptureMaterial: "terracotta",
          colors: ["#c2410c", "#ea580c", "#78350f"]
        }
      },
      {
        pageNumber: 2,
        title: "Savanna Sunset Craft Stage",
        narrative: "Help Kibali assemble a warm sunset collage with felt acacia trees, papercut suns, and clay giraffes grazing on sweet leaves!",
        artForm: "craft" as const,
        educationBuddyTip: "Drag felt trees and sun pieces onto the savanna stage to build a rich sunset ecosystem!",
        interactiveData: {
          backgroundTheme: "garden",
          availablePieces: [
            { id: 'paper-sun', type: 'papercut', name: 'Golden Sun', emoji: '☀️', color: '#f59e0b' },
            { id: 'cut-tree', type: 'papercut', name: 'Acacia Tree', emoji: '🌳', color: '#15803d' },
            { id: 'clay-rabbit', type: 'clay', name: 'Clay Gazelle', emoji: '🦌', color: '#d97706' }
          ]
        }
      }
    ]
  },
  {
    title: "The Ocean Glass Coral Kingdom",
    description: "A marine biology and crystal glass art book exploring shimmering coral reefs and translucent sea craft.",
    author: "Marina Oceanus (Marine Glass Sculptor)",
    accentColor: "teal",
    tags: ["Coral", "Ocean", "Glass", "Marine"],
    pages: [
      {
        pageNumber: 1,
        title: "The Crystal Glass Coral Reef",
        narrative: "Deep in the turquoise ocean bay, Marina blows radiant glass corals that refract sunlight into rainbow rays. Marine life thrives around these glass sanctuaries!",
        artForm: "sculpture" as const,
        educationBuddyTip: "Spin this Crystal Glass model! Notice how light passes through the translucent turquoise facets.",
        interactiveData: {
          sculptureId: "gem",
          sculptureMaterial: "glass",
          colors: ["#38bdf8", "#0ea5e9", "#10b981"]
        }
      },
      {
        pageNumber: 2,
        title: "Undersea Coral Parade",
        narrative: "Tap the swimming sea creatures to watch them glide across the coral reef in animated ocean currents!",
        artForm: "animation" as const,
        educationBuddyTip: "Tap the ocean octopus and fish to make them spin and release underwater bubbles!",
        interactiveData: {
          animatableElements: [
            { id: 'fish', label: 'Glazed Fish', emoji: '🐠', bounceType: 'sway', x: 30, y: 40 },
            { id: 'octopus', label: 'Sea Octopus', emoji: '🐙', bounceType: 'bounce', x: 70, y: 60 }
          ]
        }
      }
    ]
  },
  {
    title: "The Cosmic Space Rover & Star Crystal",
    description: "An astronomy and futuristic 3D design tale exploring obsidian space crystals and orbital rockets.",
    author: "Dr. Cosmos Sterling (Astro-Art Director)",
    accentColor: "indigo",
    tags: ["Space", "Crystal", "Obsidian", "Galaxy"],
    pages: [
      {
        pageNumber: 1,
        title: "Harvesting Obsidian Star Crystals",
        narrative: "Floating past Saturn's rings, Dr. Cosmos discovers dark obsidian crystals reflecting cosmic nebulae. 'Volcanic obsidian mirror glass holds the secrets of distant stars!' he announces.",
        artForm: "sculpture" as const,
        educationBuddyTip: "Spin this Dark Obsidian Crystal! Rotate toward the spotlight to see glossy galaxy reflections.",
        interactiveData: {
          sculptureId: "gem",
          sculptureMaterial: "obsidian",
          colors: ["#1e293b", "#6366f1", "#a855f7"]
        }
      }
    ]
  },
  {
    title: "The Magical Tribal Drum & Wood Rhythms",
    description: "A heritage woodcarving and musical craft story teaching drum acoustics and ceremonial masks.",
    author: "Master Amadi (Heritage Wood Carver)",
    accentColor: "amber",
    tags: ["Drum", "Heritage", "Woodcraft", "Rhythm"],
    pages: [
      {
        pageNumber: 1,
        title: "Carving the Ceremonial Mask",
        narrative: "Master Amadi uses polished redwood to carve an authentic ceremonial mask. Each geometric groove tells a story of unity, courage, and ancient song.",
        artForm: "sculpture" as const,
        educationBuddyTip: "Observe this Carved Wooden Mask! Drag to rotate and admire the polished redwood grain and geometric facial planes.",
        interactiveData: {
          sculptureId: "statue",
          sculptureMaterial: "wood",
          colors: ["#78350f", "#9a3412", "#b45309"]
        }
      }
    ]
  },
  {
    title: "The Golden Sun Pyramid of Alexandria",
    description: "An ancient history and architectural modeling adventure exploring gold capstones and papyrus art.",
    author: "Tariq El-Masri (Architectural Clay Sculptor)",
    accentColor: "yellow",
    tags: ["Pyramid", "Egypt", "Gold", "Architecture"],
    pages: [
      {
        pageNumber: 1,
        title: "Capping the Golden Pyramid",
        narrative: "Tariq places a solid gold capstone atop the stepped pyramid model. As midday sun strikes the peak, warm rays illuminate the desert valley below!",
        artForm: "sculpture" as const,
        educationBuddyTip: "Examine this 3D Golden Stepped Pyramid! Spin to view the three architectural tiers and gleaming capstone.",
        interactiveData: {
          sculptureId: "pyramid",
          sculptureMaterial: "gold",
          colors: ["#eab308", "#fbbf24", "#d97706"]
        }
      }
    ]
  },
  {
    title: "The Emerald Scarab & Jewel Garden",
    description: "A botanical illustration and gemstone craft book centered on jade scarab beetles and flower craft.",
    author: "Camille Laurent (Jewel & Clay Artisan)",
    accentColor: "rose",
    tags: ["Beetle", "Jade", "Jewel", "Botanical"],
    pages: [
      {
        pageNumber: 1,
        title: "The Glowing Jade Scarab",
        narrative: "In the royal botanical conservatory, Camille polished a rare imperial jade scarab beetle. Its rounded dome shell shines like a brilliant emerald drop!",
        artForm: "sculpture" as const,
        educationBuddyTip: "Rotate this Jade Scarab Beetle! Watch how light glints off the smooth carapace dome.",
        interactiveData: {
          sculptureId: "beetle",
          sculptureMaterial: "jade",
          colors: ["#10b981", "#059669", "#047857"]
        }
      }
    ]
  }
];

export default function ArtistWorkbench({
  onPublish,
  onUpdate,
  onDeleteBook,
  onDeleteSubscriber,
  onClose,
  onOpenBook,
  onLogout,
  isPublishing = false,
  booksList,
  subscribers,
  language,
  setLanguage,
  userAccount,
  onUpdateUserAccount,
  directMessages = [],
  bookReviews = {},
  theme = 'day',
  onToggleTheme
}: ArtistWorkbenchProps) {
  const isNight = theme === 'night';
  // Navigation & Management View States
  const [viewMode, setViewMode] = useState<'portfolios' | 'artist-books' | 'editor'>('portfolios');
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // Local active artist login/identity state
  const [activeArtistName, setActiveArtistName] = useState<string | null>(() => {
    if (userAccount && userAccount.isLoggedIn && userAccount.role === 'artist') {
      return userAccount.name || 'Artist';
    }
    try {
      const saved = localStorage.getItem('digipicture_active_artist');
      if (saved) return saved;
    } catch {
      // fallback
    }
    return userAccount?.role === 'artist' ? (userAccount.name || 'Artist') : null;
  });

  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState<boolean>(false);
  const [bookToDelete, setBookToDelete] = useState<PictureBook | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<'publish' | 'draft' | null>(null);

  // Local active dashboard tab: 'books' | 'subscribers' | 'messages' | 'storage' | 'profile'
  const [dashboardTab, setDashboardTab] = useState<'books' | 'subscribers' | 'messages' | 'storage' | 'profile'>('books');

  // Effective authenticated UID for Firebase Storage (/artist_upload/${uid}/${fileName}) & Firestore (/users/${uid}/files/${fileId})
  const effectiveUid = useMemo(() => {
    return auth.currentUser?.uid || userAccount?.uid || (userAccount?.email ? `artist_${userAccount.email.replace(/[^a-zA-Z0-9]/g, '_')}` : 'anonymous_artist');
  }, [userAccount]);

  // Firebase Storage & Firestore Metadata sync state
  const [userFiles, setUserFiles] = useState<UserFileMetadata[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState<boolean>(false);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [fileCategoryFilter, setFileCategoryFilter] = useState<string>('all');
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [fileUploadNotes, setFileUploadNotes] = useState<string>('');
  const [fileUploadCategory, setFileUploadCategory] = useState<UserFileMetadata['category']>('artwork');
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<UserFileMetadata | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState<boolean>(false);
  const [editingFileNotesId, setEditingFileNotesId] = useState<string | null>(null);
  const [editingFileNotesText, setEditingFileNotesText] = useState<string>('');
  const [copiedFileUrlId, setCopiedFileUrlId] = useState<string | null>(null);
  const [isDraggingFileInStorage, setIsDraggingFileInStorage] = useState<boolean>(false);
  const storageFileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to user's personal storage records at /users/${uid}/files
  useEffect(() => {
    if (!effectiveUid) return;
    setIsFilesLoading(true);
    const unsubscribe = subscribeToUserFiles(effectiveUid, (files) => {
      setUserFiles(files);
      setIsFilesLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [effectiveUid]);

  // Artist Profile & Settings state inside Workbench
  const [profileName, setProfileName] = useState(userAccount?.name || activeArtistName || 'Creative Artist');
  const [profileUsername, setProfileUsername] = useState(userAccount?.username || '@artist_studio');
  const [profileEmail, setProfileEmail] = useState(userAccount?.email || 'youremail@gmail.com');
  const [isEmailRevealed, setIsEmailRevealed] = useState<boolean>(false);
  const [profilePhone, setProfilePhone] = useState(userAccount?.phone || '+1 555-0192');
  const [profileAvatar, setProfileAvatar] = useState(userAccount?.avatar || '🦊');
  const [profilePicUrl, setProfilePicUrl] = useState(userAccount?.profilePicUrl || '');
  const [profileBio, setProfileBio] = useState(userAccount?.bio || 'Published Artist & Children’s Book Creator');
  const [profileCategories, setProfileCategories] = useState<string[]>(userAccount?.categories || ['Sculpture & Clay', 'Storybook Illustration', '3D Modeling & Crafts']);
  const [profileSpecialization, setProfileSpecialization] = useState<string>(userAccount?.specialization || '');
  const [studioPin, setStudioPin] = useState<string>('1234');

  // Synchronize Artist Workbench state whenever userAccount prop changes (e.g. login/signup)
  useEffect(() => {
    if (userAccount && userAccount.isLoggedIn && userAccount.role === 'artist') {
      const accName = userAccount.name || 'Artist';
      setActiveArtistName(accName);
      setProfileName(accName);
      setProfileUsername(userAccount.username || `@${accName.toLowerCase().replace(/\s+/g, '_')}`);
      setProfileEmail(userAccount.email || '');
      setProfilePhone(userAccount.phone || '');
      setProfileAvatar(userAccount.avatar || '🎨');
      setProfilePicUrl(userAccount.profilePicUrl || '');
      if (userAccount.bio) setProfileBio(userAccount.bio);
      if (userAccount.specialization) {
        setProfileSpecialization(userAccount.specialization);
      }
      if (userAccount.categories && userAccount.categories.length > 0) {
        setProfileCategories(userAccount.categories);
      }

      // Single Source of Truth: Fetch latest profile document directly from /users/{uid} or /artists/{uid}
      const targetUid = auth.currentUser?.uid || userAccount.uid || effectiveUid;
      if (targetUid || userAccount.email) {
        fetchProfileFromFirestore(targetUid, userAccount.email).then((docData) => {
          if (docData) {
            if (docData.name) {
              setActiveArtistName(docData.name);
              setProfileName(docData.name);
            }
            if (docData.username) setProfileUsername(docData.username);
            if (docData.email) setProfileEmail(docData.email);
            if (docData.phone) setProfilePhone(docData.phone);
            if (docData.avatar) setProfileAvatar(docData.avatar);
            if (docData.profilePicUrl) setProfilePicUrl(docData.profilePicUrl);
            if (docData.bio) setProfileBio(docData.bio);
            if (docData.specialization) setProfileSpecialization(docData.specialization);
            if (Array.isArray(docData.categories) && docData.categories.length > 0) {
              setProfileCategories(docData.categories);
            }
          }
        }).catch(() => {});
      }
    }
  }, [userAccount, effectiveUid]);
  
  // Security & Password Change state inside Workbench
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<boolean>(false);

  // Delete Artist Account states
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
  const [deleteAccountWithBooks, setDeleteAccountWithBooks] = useState<boolean>(true);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');

  // Secure PIN protection mapping and states for artist isolation
  const [artistPins, setArtistPins] = useState<Record<string, string>>(() => {
    const saved = safeGetJSON<Record<string, string>>('digipicture_artist_pins', {});
    if (saved && Object.keys(saved).length > 0) {
      return saved;
    }
    // Default 4-digit PINs for preloaded educators
    return {
      "Sonia Glass (Craft & Felt Educator)": "1234",
      "Hiroshi Sato (Paper Architect)": "1234"
    };
  });

  const [selectedArtistToUnlock, setSelectedArtistToUnlock] = useState<string | null>(null);
  const [unlockPin, setUnlockPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Admin Profile and Console States
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('digipicture_is_admin') === 'true';
    } catch {
      return false;
    }
  });
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminUnlockPin, setAdminUnlockPin] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'artists' | 'books' | 'subscribers'>('artists');

  // Application Modal state
  const [showApplicationModal, setShowApplicationModal] = useState<boolean>(false);
  const [appFullName, setAppFullName] = useState<string>('');
  const [appEmail, setAppEmail] = useState<string>('');
  const [appPhone, setAppPhone] = useState<string>('');
  const [appSampleImage, setAppSampleImage] = useState<string>('');
  const [appSampleFileName, setAppSampleFileName] = useState<string>('');
  const [appSubmitting, setAppSubmitting] = useState<boolean>(false);
  const [appSuccessMsg, setAppSuccessMsg] = useState<string | null>(null);
  const appFileInputRef = useRef<HTMLInputElement | null>(null);

  // Status checks for artist application: Artists are approved when marked approved by admin, adminVerified is true, or role is admin
  const isApprovedArtist = userAccount?.role === 'admin' ||
    userAccount?.status === 'approved' ||
    userAccount?.artistStatus === 'approved' ||
    userAccount?.adminVerified === true;

  const isPendingArtist = !isApprovedArtist && (
    userAccount?.status === 'pending' ||
    userAccount?.status === 'pending_application' ||
    userAccount?.artistStatus === 'pending' ||
    userAccount?.artistStatus === 'pending_application' ||
    Boolean(userAccount?.artistApplicationSubmitted)
  );

  const isRejectedArtist = !isApprovedArtist && !isPendingArtist && (
    userAccount?.status === 'rejected' ||
    userAccount?.artistStatus === 'rejected'
  );

  const isUnappliedArtist = !isApprovedArtist && !isPendingArtist && !isRejectedArtist;
  const isApplicationSubmitted = isPendingArtist || isApprovedArtist;

  // Real-time synchronization: listen for admin status update events
  useEffect(() => {
    const handleStatusUpdated = (e: any) => {
      const detail = e.detail;
      if (detail && userAccount?.email && detail.email?.toLowerCase() === userAccount.email.toLowerCase()) {
        const isApproved = detail.status === 'approved' || detail.adminVerified === true;
        if (onUpdateUserAccount && userAccount) {
          onUpdateUserAccount({
            ...userAccount,
            status: detail.status,
            artistStatus: detail.status,
            adminVerified: isApproved,
            ...(isApproved ? { verifiedAt: new Date().toISOString() } : {})
          });
        }
      }
    };
    window.addEventListener('digipicture_artist_status_updated', handleStatusUpdated);
    return () => {
      window.removeEventListener('digipicture_artist_status_updated', handleStatusUpdated);
    };
  }, [userAccount?.email, onUpdateUserAccount]);

  // Auto-sync status from local registry and Firestore on workbench mount / account change
  useEffect(() => {
    if (!userAccount?.email) return;
    const cleanEmail = userAccount.email.trim().toLowerCase();

    // 1. Instant check in local registered artists
    try {
      const list = safeGetJSON<any[]>('digipicture_registered_artists', []);
      if (Array.isArray(list)) {
        const found = list.find((a: any) => a && a.email?.trim().toLowerCase() === cleanEmail);
        if (found) {
          const isFoundApproved = found.status === 'approved' || found.artistStatus === 'approved' || found.adminVerified === true;
          if (isFoundApproved && (!userAccount.adminVerified || userAccount.status !== 'approved')) {
            if (onUpdateUserAccount) {
              onUpdateUserAccount({
                ...userAccount,
                status: 'approved',
                artistStatus: 'approved',
                adminVerified: true,
                verifiedAt: found.verifiedAt || new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Local sync check notice:", e);
    }

    // 2. Fresh Firestore check
    getUserAndArtistDoc(cleanEmail, userAccount.uid).then(({ artistDoc, userDoc }) => {
      const docData = artistDoc || userDoc;
      if (docData) {
        const isDocApproved = docData.status === 'approved' || docData.artistStatus === 'approved' || docData.adminVerified === true;
        if (isDocApproved && (!userAccount.adminVerified || userAccount.status !== 'approved')) {
          if (onUpdateUserAccount) {
            onUpdateUserAccount({
              ...userAccount,
              status: 'approved',
              artistStatus: 'approved',
              adminVerified: true,
              verifiedAt: docData.verifiedAt || new Date().toISOString()
            });
          }
        }
      }
    }).catch(() => {});
  }, [userAccount?.email]);

  const isVideoMedia = (url?: string, fileName?: string): boolean => {
    if (!url) return false;
    if (url.startsWith('data:video/')) return true;
    if (/\.(mp4|mov|webm|ogv|m4v)(\?.*)?$/i.test(url)) return true;
    if (fileName && /\.(mp4|mov|webm|ogv|m4v)$/i.test(fileName)) return true;
    return false;
  };

  const processArtworkFile = (file: File) => {
    setAppSampleFileName(file.name);
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|ogv|m4v)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAppSampleImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      compressImageFile(file).then((compressed) => {
        setAppSampleImage(compressed);
      }).catch(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setAppSampleImage(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveSampleImage = () => {
    setAppSampleImage('');
    setAppSampleFileName('');
    if (appFileInputRef.current) {
      appFileInputRef.current.value = '';
    }
  };

  const handleOpenApplicationModal = () => {
    setAppFullName(userAccount?.name || activeArtistName || '');
    setAppEmail(userAccount?.email || '');
    setAppPhone(userAccount?.phone || '');
    if (isPendingArtist || isApprovedArtist || userAccount?.artistApplicationSubmitted) {
      setAppSampleImage(userAccount?.sampleImageUrl || '');
      setAppSampleFileName(userAccount?.sampleImageUrl ? 'Submitted_Artwork.png' : '');
    } else {
      // Start completely empty for new artist applications
      setAppSampleImage('');
      setAppSampleFileName('');
    }
    if (appFileInputRef.current) {
      appFileInputRef.current.value = '';
    }
    setAppSuccessMsg(null);
    setShowApplicationModal(true);
    playChime('sparkle');
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isApplicationSubmitted) {
      alert(language === 'en' ? 'Your application has already been submitted and cannot be edited.' : 'Ombi lako tayari limewasilishwa na haliwezi kubadilishwa.');
      return;
    }

    if (!appFullName.trim() || !appEmail.trim() || !appPhone.trim() || !appSampleImage.trim()) {
      alert(language === 'en' ? 'Please fill out all required application fields, including your sample artwork file/URL.' : 'Tafadhali jaza nafasi zote, ikijumuisha sampuli ya kazi yako.');
      return;
    }

    setAppSubmitting(true);
    try {
      const updatedAccount: UserAccount = {
        ...(userAccount || {}),
        name: appFullName.trim(),
        email: appEmail.trim().toLowerCase(),
        phone: appPhone.trim(),
        sampleImageUrl: appSampleImage.trim(),
        avatar: userAccount?.avatar || '🎨',
        status: 'pending_application',
        artistStatus: 'pending_application',
        role: 'artist',
        isLoggedIn: true,
        artistApplicationSubmitted: true,
        artistApplicationDate: new Date().toISOString(),
        adminVerified: false
      };

      if (onUpdateUserAccount) {
        onUpdateUserAccount(updatedAccount);
      }

      safeSetItem('digipicture_user_account', updatedAccount);

      try {
        let registeredList = safeGetJSON<any[]>('digipicture_registered_artists', []);
        if (!Array.isArray(registeredList)) registeredList = [];
        const existingIdx = registeredList.findIndex(a => a && (a.email?.toLowerCase() === updatedAccount.email?.toLowerCase() || a.name?.toLowerCase() === updatedAccount.name?.toLowerCase()));
        const artistRecord = {
          name: updatedAccount.name,
          email: updatedAccount.email,
          phone: updatedAccount.phone,
          sampleImageUrl: updatedAccount.sampleImageUrl,
          status: 'pending_application',
          artistStatus: 'pending_application',
          role: 'artist',
          adminVerified: false,
          createdAt: new Date().toISOString()
        };
        if (existingIdx >= 0) {
          registeredList[existingIdx] = { ...registeredList[existingIdx], ...artistRecord };
        } else {
          registeredList.push(artistRecord);
        }
        safeSetItem('digipicture_registered_artists', registeredList);
      } catch (err) {
        console.warn("Failed to update registered artists in localStorage:", err);
      }

      await registerArtistWithFirebase({
        name: updatedAccount.name,
        email: updatedAccount.email,
        phone: updatedAccount.phone,
        sampleImageUrl: updatedAccount.sampleImageUrl,
        status: 'pending_application',
        artistStatus: 'pending_application',
        role: 'artist',
        adminVerified: false,
        createdAt: new Date().toISOString()
      });

      setAppSuccessMsg(language === 'en'
        ? "Application submitted successfully! Your application has been sent to the Admin Dashboard for verification."
        : "Ombi limetumwa kwa mafanikio! Ombi lako limetumwa kwa Msimamizi ili kukaguliwa."
      );

      setTimeout(() => {
        setShowApplicationModal(false);
        setAppSuccessMsg(null);
      }, 2500);

      playChime('sparkle');
    } catch (err) {
      console.error("Failed to submit artist application:", err);
      alert(language === 'en' ? 'Submission error. Please try again.' : 'Hitilafu katika kutuma ombi.');
    } finally {
      setAppSubmitting(false);
    }
  };

  // Artist Social Media Sharing States
  const [artistShareTarget, setArtistShareTarget] = useState<{
    type: 'book' | 'portfolio';
    book?: PictureBook;
  } | null>(null);
  const [sharePreset, setSharePreset] = useState<'release' | 'workshop' | 'educator'>('release');
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  // Drag & Drop highlight state for artwork uploads
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenArtistShare = (type: 'book' | 'portfolio', book?: PictureBook) => {
    setArtistShareTarget({ type, book });
    setCopiedShareLink(false);
    setCopiedCaption(false);
    playChime('sparkle');
  };

  // Book editor states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [author, setAuthor] = useState<string>(activeArtistName || '');
  const [accentColor, setAccentColor] = useState<string>('orange');
  const [tags, setTags] = useState<string>('Symmetry, Fabric');
  const [coverPhoto, setCoverPhoto] = useState<string>('https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400');
  const [downloadPermission, setDownloadPermission] = useState<'yes' | 'no' | 'watermark'>('yes');
  const [isCoverPreviewZoomed, setIsCoverPreviewZoomed] = useState<boolean>(false);
  const [showPresetGallery, setShowPresetGallery] = useState<boolean>(true);

  // Book pages state
  const [pages, setPages] = useState<BookPage[]>([
    {
      id: `page-1`,
      pageNumber: 1,
      title: '',
      narrative: '',
      artForm: 'sculpture',
      educationBuddyTip: '',
      interactiveData: {
        sculptureId: 'pot',
        sculptureMaterial: 'clay',
        colors: ['#ea580c', '#3b82f6', '#10b981']
      }
    }
  ]);

  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Compute unique artists and their corresponding books
  const uniqueArtists = useMemo(() => {
    const map = new Map<string, { name: string; booksCount: number; books: PictureBook[] }>();
    booksList.forEach((book) => {
      const name = (book.author || 'Anonymous Artist').trim();
      const existing = map.get(name);
      if (existing) {
        existing.booksCount += 1;
        existing.books.push(book);
      } else {
        map.set(name, {
          name,
          booksCount: 1,
          books: [book]
        });
      }
    });
    return Array.from(map.values());
  }, [booksList]);

  // Launch fresh book creator form
  const startNewBook = () => {
    if (!isApprovedArtist) {
      if (isPendingArtist) {
        alert(language === 'en' 
          ? '⏳ Artist Application Pending: Your application is currently under review by an administrator. You can only create and publish picture books after your account has been approved.'
          : '⏳ Ombi Linasubiri: Ombi lako linakaguliwa na msimamizi. Unaweza kutengeneza na kuchapisha vitabu baada ya kuidhinishwa na msimamizi.');
        handleOpenApplicationModal();
        return;
      }
      if (isRejectedArtist) {
        alert(language === 'en'
          ? '❌ Application Declined: Your previous artist application was declined by the administrator. Please update your artwork sample and re-apply to be verified.'
          : '❌ Ombi Halikuidhinishwa: Ombi lako lilikataliwa na msimamizi. Tafadhali sasisha sampuli ya kazi yako na utume ombi jipya.');
        handleOpenApplicationModal();
        return;
      }
      alert(language === 'en'
        ? '🎨 Verification Application Required: Please submit your artist application with a sample of your artwork to the administrator for approval before creating picture books.'
        : '🎨 Ombi la Uhakiki Linahitajika: Tafadhali wasilisha ombi lako na sampuli ya kazi yako kwa msimamizi ili uidhinishwe kabla ya kutengeneza vitabu.');
      handleOpenApplicationModal();
      return;
    }
    setEditingBookId(null);
    setTitle('');
    setDescription('');
    setAuthor(activeArtistName || '');
    setAccentColor('orange');
    setTags('Symmetry, Fabric');
    setCoverPhoto('https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400');
    setPages([
      {
        id: `page-1`,
        pageNumber: 1,
        title: '',
        narrative: '',
        artForm: 'sculpture',
        educationBuddyTip: '',
        interactiveData: {
          sculptureId: 'pot',
          sculptureMaterial: 'clay',
          colors: ['#ea580c', '#3b82f6', '#10b981']
        }
      }
    ]);
    setDownloadPermission('yes');
    setActivePageIndex(0);
    setViewMode('editor');
    playChime('sparkle');
  };

  // Launch editor for existing book
  const startEditingBook = (book: PictureBook) => {
    setEditingBookId(book.id);
    setTitle(book.title);
    setDescription(book.description);
    setAuthor(book.author);
    setAccentColor(book.accentColor);
    setTags(book.tags.join(', '));
    setCoverPhoto(book.coverImage);
    setPages(book.pages);
    setDownloadPermission(book.downloadPermission || 'yes');
    setActivePageIndex(0);
    setViewMode('editor');
    playChime('sparkle');
  };

  // Launch editor for existing book with a new page appended instantly
  const startAddPagesForBook = (book: PictureBook) => {
    setEditingBookId(book.id);
    setTitle(book.title);
    setDescription(book.description);
    setAuthor(book.author);
    setAccentColor(book.accentColor);
    setTags(book.tags.join(', '));
    setCoverPhoto(book.coverImage);

    const newPageNum = book.pages.length + 1;
    const newPage: BookPage = {
      id: `custom-page-${Date.now()}-${newPageNum}`,
      pageNumber: newPageNum,
      title: '',
      narrative: '',
      artForm: 'painting',
      educationBuddyTip: '',
      interactiveData: {
        colors: ['#16a34a', '#eab308', '#2563eb', '#dc2626']
      }
    };

    setPages([...book.pages, newPage]);
    setDownloadPermission(book.downloadPermission || 'yes');
    setActivePageIndex(book.pages.length);
    setViewMode('editor');
    playChime('sparkle');
  };

  const applyTemplate = (template: typeof INSPIRATION_TEMPLATES[0]) => {
    playChime('sparkle');
    setTitle(template.title);
    setDescription(template.description);
    setAuthor(activeArtistName || template.author);
    setAccentColor(template.accentColor);
    setTags(template.tags.join(', '));
    
    const formattedPages: BookPage[] = template.pages.map((p, idx) => ({
      id: `custom-page-${Date.now()}-${idx}`,
      pageNumber: p.pageNumber,
      title: p.title,
      narrative: p.narrative,
      artForm: p.artForm,
      educationBuddyTip: p.educationBuddyTip,
      interactiveData: p.interactiveData
    }));

    setPages(formattedPages);
    setActivePageIndex(0);
  };

  const handleClearTemplate = () => {
    playChime('bubble');
    setTitle('');
    setDescription('');
    setTags('');
    setPages([
      {
        id: `page-1`,
        pageNumber: 1,
        title: '',
        narrative: '',
        artForm: 'painting',
        educationBuddyTip: '',
        artistName: activeArtistName || author || '',
        interactiveData: {
          colors: ['#16a34a', '#eab308', '#2563eb', '#dc2626']
        }
      }
    ]);
    setActivePageIndex(0);
    setFormError(null);
  };

  // Add a new blank page
  const addPage = () => {
    playChime('pop');
    const newPageNum = pages.length + 1;
    const currentArtist = activeArtistName || author || 'Anonymous Artist';
    const newPage: BookPage = {
      id: `custom-page-${Date.now()}-${newPageNum}`,
      pageNumber: newPageNum,
      title: '',
      narrative: '',
      artForm: 'painting',
      educationBuddyTip: '',
      artistName: currentArtist,
      interactiveData: {
        colors: ['#16a34a', '#eab308', '#2563eb', '#dc2626']
      }
    };
    setPages([...pages, newPage]);
    setActivePageIndex(pages.length);
  };

  // Remove a page with multi-artist protection check
  const removePage = (index: number) => {
    if (pages.length <= 1) return;
    const pageToRemove = pages[index];
    if (pageToRemove?.artistName && activeArtistName && pageToRemove.artistName !== activeArtistName) {
      setFormError(language === 'en'
        ? `🔒 Protected: Page ${index + 1} was created by artist "${pageToRemove.artistName}". You cannot delete work created by another artist!`
        : `🔒 Imezuiwa: Ukurasa wa ${index + 1} uliundwa na msanii "${pageToRemove.artistName}". Huwezi kufuta kazi ya msanii mwingine!`);
      setTimeout(() => setFormError(null), 5000);
      playChime('bubble');
      return;
    }
    playChime('bubble');
    const filtered = pages.filter((_, idx) => idx !== index);
    const updated = filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setPages(updated);
    setActivePageIndex(Math.max(0, index - 1));
  };

  // Modify specific fields of the active page
  const updateActivePage = (fields: Partial<BookPage>) => {
    setPages(prev =>
      prev.map((p, idx) => {
        if (idx === activePageIndex) {
          return { ...p, ...fields, artistName: activeArtistName || author || p.artistName };
        }
        return p;
      })
    );
  };

  const updateActivePageInteractive = (fields: any) => {
    setPages(prev =>
      prev.map((p, idx) => {
        if (idx === activePageIndex) {
          return {
            ...p,
            interactiveData: {
              ...p.interactiveData,
              ...fields
            }
          };
        }
        return p;
      })
    );
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleUploadFileToStorage = async (file: File, customCategory?: UserFileMetadata['category']) => {
    if (!file) return;
    setIsUploadingFile(true);
    setUploadProgressMsg(language === 'en' ? `Uploading "${file.name}" to storage...` : `Inapakia "${file.name}"...`);
    try {
      const fileRecord = await uploadArtistFileToStorage(file, effectiveUid, {
        fileName: file.name,
        notes: fileUploadNotes.trim(),
        category: customCategory || fileUploadCategory,
        status: 'active'
      });
      setFileUploadNotes('');
      setUploadProgressMsg(language === 'en' ? `✅ Uploaded ${file.name} to personal storage & synced metadata!` : `✅ Imepakiwa na kusawazishwa kwa mafanikio!`);
      playChime('sparkle');
      setTimeout(() => setUploadProgressMsg(null), 4000);
      return fileRecord;
    } catch (err: any) {
      console.error("Storage upload failed:", err);
      setUploadProgressMsg(language === 'en' ? `❌ Storage upload notice: ${err?.message || 'Check connection'}` : `❌ Hitilafu ya upakiaji`);
      setTimeout(() => setUploadProgressMsg(null), 5000);
      return null;
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDownloadFile = async (fileItem: UserFileMetadata) => {
    try {
      const { url, fileName } = await downloadArtistFileFromStorage(effectiveUid, fileItem.fileName, fileItem.fileUrl);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playChime('sparkle');
    } catch (err) {
      console.error("File download notice:", err);
      if (fileItem.fileUrl) {
        window.open(fileItem.fileUrl, '_blank');
      }
    }
  };

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);
    try {
      const res = await deleteArtistFileAndSync(
        effectiveUid,
        fileToDelete.fileId,
        fileToDelete.fileName,
        fileToDelete.fileUrl
      );
      playChime('pop');
      setFileToDelete(null);
    } catch (err) {
      console.error("Failed to delete file:", err);
      alert(language === 'en' ? "Failed to delete file." : "Hitilafu katika kufuta faili.");
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleSaveFileNotes = async (fileId: string) => {
    if (!fileId) return;
    try {
      await updateUserFileMetadataInFirestore(effectiveUid, fileId, {
        notes: editingFileNotesText.trim()
      });
      setEditingFileNotesId(null);
      setEditingFileNotesText('');
      playChime('sparkle');
    } catch (err) {
      console.error("Failed to update notes:", err);
    }
  };

  const handleCopyFileUrl = (fileId: string, url: string) => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopiedFileUrlId(fileId);
    playChime('sparkle');
    setTimeout(() => setCopiedFileUrlId(null), 2500);
  };

  const handleMediaFile = (file: File) => {
    if (!file) return;

    const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'm4v', 'mkv'].includes(ext);
    
    if (!isImage && !isVideo) {
      setFormError(language === 'en' 
        ? "⚠️ Please upload a valid image (JPG, PNG, WEBP, GIF, SVG) or video file!" 
        : "⚠️ Tafadhali pakia faili halali ya picha au video!");
      setTimeout(() => setFormError(null), 5000);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFormError(language === 'en'
        ? "⚠️ File size is too large! Please choose an image or video smaller than 25MB."
        : "⚠️ Ukubwa wa faili ni mkubwa mno! Tafadhali chagua chini ya 25MB.");
      setTimeout(() => setFormError(null), 5000);
      return;
    }

    // Upload directly to Firebase Storage (/artist_upload/${uid}/${fileName}) & sync metadata (/users/${uid}/files/${fileId})
    uploadArtistFileToStorage(file, effectiveUid, {
      fileName: file.name,
      notes: `Uploaded for page ${activePageIndex + 1}: ${pages[activePageIndex]?.title || 'Scene'}`,
      category: isVideo ? 'video' : 'artwork'
    }).then((record) => {
      if (record && record.fileUrl) {
        // Keep cloud storage URL as a backup while preserving base64 dataUrl for bulletproof client rendering
        updateActivePage({
          cloudStorageUrl: record.fileUrl,
          mediaType: isVideo ? 'video' : 'image',
          ...(isVideo ? { mediaUrl: record.fileUrl } : {})
        });
      }
    }).catch((e) => {
      console.warn("Direct storage upload fallback to local compression:", e);
    });
    
    // Convert image file with canvas compression or video via FileReader for immediate display
    if (isImage) {
      compressImageFile(file, 1200, 1200, 0.82)
        .then((dataUrl) => {
          if (dataUrl) {
            updateActivePage({
              mediaUrl: dataUrl,
              localDataUrl: dataUrl,
              imageUrl: dataUrl,
              mediaType: 'image'
            });
            setFormError(null);
            playChime('sparkle');
          }
        })
        .catch(() => {
          setFormError(language === 'en'
            ? "⚠️ Failed to process image file. Please try uploading again."
            : "⚠️ Imeshindikana kusoma faili ya picha. Tafadhali jaribu tena.");
          setTimeout(() => setFormError(null), 5000);
        });
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          updateActivePage({
            mediaUrl: dataUrl,
            mediaType: 'video'
          });
          setFormError(null);
          playChime('sparkle');
        }
      };
      reader.onerror = () => {
        setFormError(language === 'en'
          ? "⚠️ Failed to read video file. Please try uploading again."
          : "⚠️ Imeshindikana kusoma faili ya video. Tafadhali jaribu tena.");
        setTimeout(() => setFormError(null), 5000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBook = async (targetStatus: PictureBook['status'] = 'published') => {
    if (isSubmitting || isPublishing) return;
    setFormError(null);

    if (targetStatus === 'published' && userAccount?.role === 'artist') {
      if (userAccount.status === 'suspended' || userAccount.status === 'rejected') {
        setFormError(language === 'en'
          ? "🚫 Account Suspended or Rejected: Publishing privileges are currently restricted. Please contact the administrator team."
          : "🚫 Akaunti Imesitishwa: Huwezi kuchapisha vitabu kwa sasa. Tafadhali wasiliana na msimamizi.");
        setTimeout(() => setFormError(null), 6000);
        playChime('bubble');
        return;
      }
    }

    if (!title || !author) {
      setFormError(language === 'en' 
        ? "⚠️ Please specify a Story Title and Artist Name!" 
        : "⚠️ Tafadhali taja Jina la Hadithi na Jina la Msanii!");
      setTimeout(() => setFormError(null), 5000);
      return;
    }

    if (targetStatus === 'published') {
      const normTitle = title.trim().toLowerCase();
      const isTemplateTitle = INSPIRATION_TEMPLATES.some(t => t.title.trim().toLowerCase() === normTitle);
      const isInitialBookTitle = INITIAL_BOOKS.some(b => b.title.trim().toLowerCase() === normTitle);
      const isSystemBookInList = booksList.some(b => (!b.isCustom || (b.id === editingBookId && !b.isCustom)) && b.title.trim().toLowerCase() === normTitle);
      const isEditingSystemBookDirectly = editingBookId ? booksList.some(b => b.id === editingBookId && !b.isCustom) : false;

      if (isTemplateTitle || isInitialBookTitle || isSystemBookInList || isEditingSystemBookDirectly) {
        setFormError(language === 'en'
          ? "⚠️ Pre-provided example books and templates cannot be published directly to children! Please change the story title and personalize the content to publish your own unique book."
          : "⚠️ Mifano ya vitabu vilivyotolewa haiwezi kuchapishwa moja kwa moja kwa watoto! Tafadhali badilisha kichwa cha hadithi na ubadilishe maudhui ili kuchapisha kitabu chako cha kipekee."
        );
        setTimeout(() => setFormError(null), 6500);
        return;
      }
    }

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (!p.title || !p.title.trim()) {
        setActivePageIndex(i);
        setFormError(language === 'en' 
          ? `⚠️ Please fill in the Page Subtitle / Scene Title for Page ${i + 1}!` 
          : `⚠️ Tafadhali jaza Kichwa Kidogo cha Ukurasa kwa Ukurasa wa ${i + 1}!`);
        setTimeout(() => setFormError(null), 5500);
        return;
      }
      if (!p.narrative || !p.narrative.trim()) {
        setActivePageIndex(i);
        setFormError(language === 'en' 
          ? `⚠️ Please fill in the Chapter Story (Narrative text) for Page ${i + 1}!` 
          : `⚠️ Tafadhali jaza Maelezo ya Hadithi kwa Ukurasa wa ${i + 1}!`);
        setTimeout(() => setFormError(null), 5550);
        return;
      }
      if (!p.educationBuddyTip || !p.educationBuddyTip.trim()) {
        setActivePageIndex(i);
        setFormError(language === 'en' 
          ? `⚠️ Please fill in the Art Companion Tip for Page ${i + 1}!` 
          : `⚠️ Tafadhali jaza Ushauri wa Kisanii kwa Ukurasa wa ${i + 1}!`);
        setTimeout(() => setFormError(null), 5500);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmittingAction(targetStatus === 'draft' ? 'draft' : 'publish');

    try {
      const textToScan = `${title} ${description} ${tags} ${pages.map(p => `${p.title} ${p.narrative} ${p.educationBuddyTip}`).join(' ')}`;
      const scanResult = scanForInappropriateContent(textToScan);
      const isApproved = userAccount?.role === 'admin' || ((userAccount?.status === 'approved' || userAccount?.artistStatus === 'approved') && userAccount?.adminVerified === true);
      let finalStatus: 'published' | 'draft' | 'pending_review' | 'pending_approval' | 'flagged' = targetStatus;

      if (targetStatus === 'published' && !isApproved) {
        finalStatus = 'pending_approval';
      }

      if (scanResult.isFlagged) {
        finalStatus = 'flagged';
        setFormError(language === 'en'
          ? `⚠️ Automated Moderation Guard: Inappropriate terms detected ("${scanResult.matchedWords.join(', ')}"). Book saved as FLAGGED and removed from public shelf.`
          : `⚠️ Ulinzi wa Maudhui: Maneno yasiyofaa yamepatikana ("${scanResult.matchedWords.join(', ')}"). Kitabu kimehifadhiwa kama KIMEZUIWA.`
        );
      } else if (finalStatus === 'pending_approval' || finalStatus === 'pending_review') {
        setFormError(language === 'en'
          ? "Your picturebook is pending admin review and will go live once your application and content are approved."
          : "Kitabu chako kinasubiri ukaguzi wa msimamizi na kitaanza kuonyeshwa baada ya maombi na maudhui yako kuidhinishwa."
        );
        setTimeout(() => setFormError(null), 8000);
      }

      const contributors: string[] = Array.from(new Set(
        pages.map(p => p.artistName || author).filter((name): name is string => Boolean(name))
      ));

      playChime('sparkle');
      const nowIso = new Date().toISOString();
      const currentUserId = userAccount?.uid || (userAccount as any)?.id || (userAccount?.email ? `user-${userAccount.email}` : undefined);
      const currentUserEmail = userAccount?.email || undefined;
      const assignedBookId = editingBookId || `book-custom-${Date.now()}`;
      const finalBook: PictureBook = {
        id: assignedBookId,
        title,
        description: description || 'A custom picture book crafted with love.',
        author,
        userId: currentUserId,
        authorId: currentUserId,
        authorEmail: currentUserEmail,
        contributors,
        status: finalStatus,
        coverImage: coverPhoto,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        accentColor,
        artForms: Array.from(new Set(pages.map(p => p.artForm))),
        pages: pages.map(p => ({ ...p, artistName: p.artistName || activeArtistName || author })),
        isCustom: true,
        downloadPermission,
        createdAt: editingBookId ? (pages[0]?.id ? undefined : nowIso) : nowIso,
        updatedAt: nowIso
      };

      await saveBookToFirestore(finalBook).catch(() => {});

      if (editingBookId) {
        await onUpdate(finalBook);
      } else {
        setEditingBookId(assignedBookId);
        await onPublish(finalBook);
      }

      if (finalStatus === 'published') {
        handleOpenArtistShare('book', finalBook);
      }
    } catch (err) {
      console.error("Save/publish book failed:", err);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isPublishing) return;
    handleSaveBook('published');
  };

  // Helper cover images kids will love
  const presetCovers = [
    { url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400', label: '🎨 Palette' },
    { url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=400', label: '🏺 Pottery' },
    { url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=400', label: '🌲 Forest' },
    { url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=400', label: '🐠 Coral' },
    { url: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&q=80&w=400', label: '🦁 Safari' },
    { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400', label: '🚀 Galaxy' },
    { url: 'https://images.unsplash.com/photo-1517697471339-4aa32003c11a?auto=format&fit=crop&q=80&w=400', label: '📜 Origami' },
    { url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=400', label: '🗿 Sculpture' },
    { url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&q=80&w=400', label: '🌸 Garden' },
    { url: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&q=80&w=400', label: '🦋 Butterfly' },
    { url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=400', label: '🧶 Textiles' },
    { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400', label: '🌋 Terracotta' },
    { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400', label: '🌊 Ocean' },
    { url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&q=80&w=400', label: '🦜 Parrot' },
    { url: 'https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&q=80&w=400', label: '🍄 Mushroom' },
    { url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&q=80&w=400', label: '☀️ Sunset' }
  ];

  const getCoverSourceLabel = (url: string) => {
    if (!url) return language === 'en' ? 'No Cover Selected' : 'Hakuna Jalada Lililochaguliwa';
    const matched = presetCovers.find(p => p.url === url);
    if (matched) return `🎨 ${language === 'en' ? 'Preset' : 'Aina'}: ${matched.label}`;
    if (url.startsWith('data:image')) return language === 'en' ? '📁 Custom Uploaded File' : '📁 Faili Iliyopakiwa';
    if (url.startsWith('http')) return language === 'en' ? '🌐 Web Image Link' : '🌐 Linki ya Mtandaoni';
    return language === 'en' ? '🖼️ Custom Cover Image' : '🖼️ Picha ya Jalada';
  };

  const handlePerformLogout = async () => {
    setActiveArtistName(null);
    if (onLogout) {
      await onLogout();
    } else {
      await signOutFromFirebaseAndClearSession();
      if (onUpdateUserAccount) {
        onUpdateUserAccount({
          role: 'student',
          name: 'Guest Explorer',
          avatar: '🐣',
          email: '',
          username: '@guest',
          isLoggedIn: false
        });
      }
    }
    setViewMode('portfolios');
    setEditingBookId(null);
    setShowLogoutConfirmModal(false);
    playChime('bubble');
    if (onClose) {
      onClose();
    }
  };

  const handleRegisterArtist = (name: string, pin: string) => {
    const trimmedName = name.trim();
    const trimmedPin = pin.trim();
    if (!trimmedName || !trimmedPin) return;

    const updatedPins = { ...artistPins, [trimmedName]: trimmedPin };
    setArtistPins(updatedPins);
    try {
      localStorage.setItem('digipicture_artist_pins', JSON.stringify(updatedPins));
    } catch (err) {
      console.error("Failed to save artist PINs:", err);
    }

    setActiveArtistName(trimmedName);
    try {
      localStorage.setItem('digipicture_active_artist', trimmedName);
    } catch (err) {
      console.error(err);
    }
    setViewMode('portfolios');
    playChime('sparkle');
  };

  const handleVerifyUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArtistToUnlock) return;

    const correctPin = artistPins[selectedArtistToUnlock] || "1234";
    if (unlockPin.trim() === correctPin.trim()) {
      setActiveArtistName(selectedArtistToUnlock);
      try {
        localStorage.setItem('digipicture_active_artist', selectedArtistToUnlock);
      } catch (err) {
        console.error(err);
      }
      setSelectedArtistToUnlock(null);
      setUnlockPin('');
      setPinError(null);
      setViewMode('portfolios');
      playChime('sparkle');
    } else {
      setPinError("Incorrect PIN passcode! Please try again. 🗝️");
      playChime('bubble');
    }
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUnlockPin.trim() === '9999') {
      setIsAdminMode(true);
      try {
        localStorage.setItem('digipicture_is_admin', 'true');
      } catch (err) {
        console.error(err);
      }
      setAdminUnlockPin('');
      setAdminPinError(null);
      setShowAdminLogin(false);
      playChime('sparkle');
    } else {
      setAdminPinError(language === 'en' ? "Incorrect Admin PIN! Please try again. 🗝️" : "PIN ya Admin si sahihi! Tafadhali jaribu tena. 🗝️");
      playChime('bubble');
    }
  };

  const handleAdminDeleteArtist = async (artistName: string) => {
    const confirmDelete = window.confirm(
      language === 'en'
        ? `Are you sure you want to delete artist profile "${artistName}"? This will delete their credentials.`
        : `Je, una uhakika unataka kufuta wasifu wa msanii "${artistName}"? Hii itafuta vitambulisho vyao.`
    );
    if (!confirmDelete) return;

    // Remove from PINs
    const updated = { ...artistPins };
    delete updated[artistName];
    setArtistPins(updated);
    try {
      localStorage.setItem('digipicture_artist_pins', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    // Optional: Delete books published by this artist
    const booksByArtist = booksList.filter(b => (b.author || '').trim().toLowerCase() === artistName.trim().toLowerCase());
    if (booksByArtist.length > 0) {
      const deleteBooksToo = window.confirm(
        language === 'en'
          ? `Do you also want to delete all ${booksByArtist.length} picture books uploaded by ${artistName} from the shelf and database?`
          : `Je, unataka pia kufuta vitabu vyote ${booksByArtist.length} vya picha vilivyowekwa na ${artistName} kutoka kwenye rafu na hifadhidata?`
      );
      if (deleteBooksToo) {
        for (const book of booksByArtist) {
          try {
            await onDeleteBook(book.id);
          } catch (e) {
            console.error("Failed to delete book:", book.id, e);
          }
        }
      }
    }

    playChime('bubble');
  };

  const handleAdminResetPin = (artistName: string, newPin: string) => {
    if (!newPin || newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      alert(language === 'en' ? "PIN must be exactly 4 digits!" : "PIN lazima iwe tarakimu 4 kamili!");
      return;
    }
    const updated = { ...artistPins, [artistName]: newPin };
    setArtistPins(updated);
    try {
      localStorage.setItem('digipicture_artist_pins', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    alert(language === 'en' ? `PIN for ${artistName} successfully reset to ${newPin}!` : `PIN ya ${artistName} imebadilishwa kuwa ${newPin}!`);
    playChime('sparkle');
  };

  const myBooks = useMemo(() => {
    if (!activeArtistName) return [];
    const nameNorm = activeArtistName.trim().toLowerCase();
    return booksList.filter(book => (book.author || '').trim().toLowerCase() === nameNorm);
  }, [booksList, activeArtistName]);

  // Compute the student subscribers specifically for this artist
  const mySubscribers = useMemo(() => {
    if (!activeArtistName) return [];
    const nameNorm = activeArtistName.trim().toLowerCase();
    return subscribers.filter(sub => (sub.artistName || '').trim().toLowerCase() === nameNorm);
  }, [subscribers, activeArtistName]);

  const handleSaveArtistProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveSuccess(false);

    const targetUid = auth.currentUser?.uid || userAccount?.uid || effectiveUid;

    const updatedAccount: UserAccount = {
      role: 'artist',
      uid: targetUid || userAccount?.uid,
      name: profileName.trim() || 'Creative Artist',
      email: profileEmail.trim() || 'youremail@gmail.com',
      username: profileUsername.trim().startsWith('@') ? profileUsername.trim() : `@${profileUsername.trim()}`,
      phone: profilePhone.trim(),
      avatar: profileAvatar,
      profilePicUrl: profilePicUrl.trim(),
      categories: profileCategories,
      specialization: profileSpecialization.trim(),
      bio: profileBio.trim(),
      isLoggedIn: true
    };

    // Sync Profile Writes: Write to the same document ID across both /users and /artists collections simultaneously
    if (targetUid) {
      await syncProfileToFirestore(targetUid, {
        name: updatedAccount.name,
        email: updatedAccount.email,
        username: updatedAccount.username,
        phone: updatedAccount.phone,
        avatar: updatedAccount.avatar,
        profilePicUrl: updatedAccount.profilePicUrl,
        categories: updatedAccount.categories,
        specialization: updatedAccount.specialization,
        bio: updatedAccount.bio,
        role: 'artist',
        isLoggedIn: true
      });
    }

    if (onUpdateUserAccount) {
      onUpdateUserAccount(updatedAccount);
    }

    try {
      safeSetItem('digipicture_user_account', updatedAccount);
      safeSetItem('digipicture_active_artist', updatedAccount.name);
      
      // Update in registered list
      let registered = safeGetJSON<any[]>('digipicture_registered_artists', []);
      if (!Array.isArray(registered)) registered = [];
      const filtered = registered.filter(a => a && a.email !== updatedAccount.email && a.username !== updatedAccount.username);
      filtered.push(updatedAccount);
      safeSetItem('digipicture_registered_artists', filtered);

      // Save Studio PIN
      if (studioPin && studioPin.length === 4) {
        const updatedPins = { ...artistPins, [updatedAccount.name]: studioPin };
        setArtistPins(updatedPins);
        safeSetItem('digipicture_artist_pins', updatedPins);
      }
    } catch (err) {
      console.error("Failed to save profile updates:", err);
    }

    setActiveArtistName(updatedAccount.name);
    setProfileSaveSuccess(true);
    playChime('sparkle');
    setTimeout(() => setProfileSaveSuccess(false), 5000);
  };

  const handleChangeArtistPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    if (!newPasswordInput) {
      setPasswordStatusMsg({
        type: 'error',
        msg: language === 'en' ? 'Please enter a new password.' : 'Tafadhali ingiza nenosiri jipya.'
      });
      playChime('bubble');
      return;
    }

    if (newPasswordInput.length < 8) {
      setPasswordStatusMsg({
        type: 'error',
        msg: language === 'en' ? 'Password must be at least 8 characters long for high security.' : 'Nenosiri lazima liwe na angalau herufi 8 kwa usalama.'
      });
      playChime('bubble');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordStatusMsg({
        type: 'error',
        msg: language === 'en' ? 'New passwords do not match. Please recheck.' : 'Manenosiri mapya hayafanani.'
      });
      playChime('bubble');
      return;
    }

    try {
      localStorage.setItem(`digipicture_artist_pwd_${profileEmail}`, newPasswordInput);
    } catch (err) {
      console.error(err);
    }

    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordStatusMsg({
      type: 'success',
      msg: language === 'en' ? '🔒 Password successfully updated and encrypted!' : '🔒 Nenosiri limebadilishwa kwa usalama!'
    });
    playChime('sparkle');
  };

  const handleDeleteArtistAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const emailToDelete = profileEmail || userAccount?.email || '';
      const artistNameToDelete = profileName || activeArtistName || userAccount?.name || '';

      // 1. Optionally delete picture books published by this artist
      if (deleteAccountWithBooks) {
        const booksByThisArtist = booksList.filter(
          b => (b.author || '').trim().toLowerCase() === artistNameToDelete.trim().toLowerCase()
        );
        for (const book of booksByThisArtist) {
          try {
            await onDeleteBook(book.id);
          } catch (err) {
            console.error("Failed to delete book during account deletion:", book.id, err);
          }
        }
      }

      // 2. Delete PIN record
      if (artistNameToDelete) {
        const updatedPins = { ...artistPins };
        delete updatedPins[artistNameToDelete];
        setArtistPins(updatedPins);
        try {
          localStorage.setItem('digipicture_artist_pins', JSON.stringify(updatedPins));
        } catch (err) {
          console.error(err);
        }
      }

      // 3. Delete from Firestore and Firebase Auth
      await deleteArtistAccountFromCloudAndLocal(emailToDelete);

      // 4. Reset User Account state to guest
      const guestAccount: UserAccount = {
        role: 'student',
        name: 'Guest Explorer',
        avatar: '🐣',
        email: '',
        username: '@guest',
        isLoggedIn: false
      };

      if (onUpdateUserAccount) {
        onUpdateUserAccount(guestAccount);
      }

      // 5. Trigger logout
      if (onLogout) {
        await onLogout();
      }

      playChime('sparkle');
      setShowDeleteAccountModal(false);

      // 6. Close workbench and return to bookshelf
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Failed to delete artist account:", err);
      alert(language === 'en' ? "Failed to delete account. Please try again." : "Hitilafu katika kufuta akaunti. Tafadhali jaribu tena.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className={`min-h-screen min-h-[100dvh] min-h-[100svh] w-full max-w-full p-3 sm:p-4 md:p-8 flex flex-col font-sans overflow-x-hidden box-border transition-colors duration-300 ${
      isNight ? 'bg-[#120d09] text-amber-100' : 'bg-brand-cream text-amber-955'
    }`}>
      
      {/* Top Bar Navigation */}
      <div className={`max-w-5xl mx-auto w-full max-w-full flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b pb-5 select-none box-border transition-colors duration-300 ${
        isNight ? 'border-amber-900/40' : 'border-orange-200'
      }`}>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap overflow-x-auto pb-1 max-w-full no-scrollbar shrink-0">
          <button
            onClick={onClose}
            className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl border-2 transition font-display font-bold text-[11px] sm:text-xs cursor-pointer shadow-sm whitespace-nowrap text-nowrap shrink-0 ${
              isNight
                ? 'bg-stone-900 border-stone-700 text-amber-200 hover:bg-stone-800 hover:border-amber-600'
                : 'bg-white border-orange-300 text-amber-955 hover:bg-orange-50'
            }`}
            id="workbench-back-to-shelf"
          >
            <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${isNight ? 'text-amber-300' : 'text-orange-600'}`} />
            {language === 'en' ? 'Back to Bookshelf' : 'Rudi kwenye Rafu'}
          </button>

          {/* Dynamic Theme Synchronization Toggle in Workbench */}
          {onToggleTheme && (
            <button
              onClick={() => { onToggleTheme(); playChime('pop'); }}
              className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl border-2 transition font-display font-bold text-[11px] sm:text-xs cursor-pointer shadow-sm whitespace-nowrap shrink-0 ${
                isNight
                  ? 'bg-stone-900 border-amber-600 text-amber-300 hover:bg-stone-800'
                  : 'bg-amber-100 border-amber-400 text-amber-955 hover:bg-amber-200'
              }`}
              id="workbench-theme-toggle-btn"
              title={language === 'en' ? 'Toggle Day / Night Mode' : 'Badilisha Mchana / Usiku'}
            >
              {isNight ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5 text-amber-600" />}
              <span className="hidden sm:inline">
                {isNight ? (language === 'en' ? 'Night' : 'Usiku') : (language === 'en' ? 'Day' : 'Mchana')}
              </span>
            </button>
          )}

          {isAdminMode && (
            <button
              onClick={() => {
                setIsAdminMode(false);
                localStorage.removeItem('digipicture_is_admin');
                playChime('bubble');
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-red-950 border-2 border-red-800 text-red-200 hover:bg-red-900 transition font-display font-bold text-[11px] sm:text-xs cursor-pointer shadow-sm whitespace-nowrap text-nowrap shrink-0"
              id="workbench-admin-logout"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Exit Admin Mode' : 'Ondoka Kwenye Admin'}</span>
            </button>
          )}

          {activeArtistName && (
            <button
              onClick={() => {
                setShowLogoutConfirmModal(true);
                playChime('pop');
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-stone-900 border-2 border-rose-900 text-rose-300 hover:bg-rose-950 transition font-display font-bold text-[11px] sm:text-xs cursor-pointer shadow-sm whitespace-nowrap text-nowrap shrink-0"
              id="workbench-logout-artist"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Log Out' : 'Toka'}</span>
            </button>
          )}

          {/* Dynamic Language Switcher in Workbench */}
          <div className={`flex items-center p-0.5 sm:p-1 rounded-full border select-none shadow-inner shrink-0 ${
            isNight ? 'bg-stone-900 border-stone-800' : 'bg-white border-orange-200'
          }`} id="workbench-language-switcher">
            <button
              onClick={() => { setLanguage('en'); playChime('pop'); }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] rounded-full font-bold transition-all cursor-pointer ${
                language === 'en'
                  ? (isNight ? 'bg-amber-900 text-amber-100 shadow-sm border border-amber-700' : 'bg-amber-500 text-white shadow-sm')
                  : (isNight ? 'text-stone-300 hover:text-white' : 'text-amber-900 hover:bg-orange-50')
              }`}
              title="English"
            >
              EN
            </button>
            <button
              onClick={() => { setLanguage('sw'); playChime('pop'); }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] rounded-full font-bold transition-all cursor-pointer ${
                language === 'sw'
                  ? (isNight ? 'bg-amber-900 text-amber-100 shadow-sm border border-amber-700' : 'bg-amber-500 text-white shadow-sm')
                  : (isNight ? 'text-stone-300 hover:text-white' : 'text-amber-900 hover:bg-orange-50')
              }`}
              title="Kiswahili"
            >
              SW
            </button>
          </div>
        </div>

        <div className="text-left md:text-right">
          <h1 className={`text-xl md:text-2xl font-display font-bold flex items-center md:justify-end gap-2 leading-none ${
            isNight ? 'text-amber-100' : 'text-amber-955'
          }`}>
            {isAdminMode ? (
              <>
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                <span>{language === 'en' ? 'Admin Moderation Portal' : 'Tovuti ya Moderation ya Admin'}</span>
              </>
            ) : (
              <>
                <Palette className="w-5 h-5 text-amber-500 shrink-0" />
                <span>{language === 'en' ? 'Creator Studio Workbench' : 'Meza ya Kazi ya Msanii'}</span>
              </>
            )}
          </h1>
          {!activeArtistName && !isAdminMode && (
            <p className="text-xs text-amber-300/80 font-sans mt-1">
              {language === 'en' ? 'Select or register your artist identity to begin!' : 'Chagua au sajili wasifu wako wa msanii ili kuanza!'}
            </p>
          )}
        </div>
      </div>



      {userAccount?.role === 'artist' && isPendingArtist && (
        <div className="max-w-5xl mx-auto w-full mb-6 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-bold font-display text-amber-900 dark:text-amber-100">
                {language === 'en' ? 'Artist Verification Application Pending' : 'Uhakiki wa Akaunti ya Msanii Unasubiri'}
              </p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                {language === 'en'
                  ? 'Your application with sample artwork is currently being reviewed by an administrator. Picture book creation will unlock once approved.'
                  : 'Ombi lako na sampuli ya kazi linakaguliwa na msimamizi. Utaruhusiwa kutengeneza vitabu baada ya kuidhinishwa.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenApplicationModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-display font-bold text-xs rounded-xl border border-amber-700 shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-center shrink-0 flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Pending Review' : 'Inasubiri Ukaguzi'}</span>
          </button>
        </div>
      )}

      {userAccount?.role === 'artist' && isRejectedArtist && (
        <div className="max-w-5xl mx-auto w-full mb-6 p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-bold font-display text-rose-900 dark:text-rose-100">
                {language === 'en' ? 'Artist Verification Application Declined' : 'Ombi la Msanii Limekataliwa'}
              </p>
              <p className="mt-0.5 text-rose-800 dark:text-rose-300">
                {language === 'en'
                  ? 'Your previous verification application was not approved by the administrator. Please upload a revised artwork sample and re-apply.'
                  : 'Ombi lako la awali halikuidhinishwa na msimamizi. Tafadhali pakia sampuli mpya ya kazi yako na uombe tena.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenApplicationModal}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-xs rounded-xl border border-rose-700 shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-center shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Re-apply with Artwork' : 'Omba Tena na Sampuli'}</span>
          </button>
        </div>
      )}

      {userAccount?.role === 'artist' && isUnappliedArtist && (
        <div className="max-w-5xl mx-auto w-full mb-6 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <FileCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-bold font-display text-amber-900 dark:text-amber-100">
                {language === 'en' ? 'Artist Verification Application Required' : 'Ombi la Uhakiki wa Msanii Linahitajika'}
              </p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                {language === 'en'
                  ? 'To publish and create digital picture books, submit your artist application with a sample of your artwork for administrator verification.'
                  : 'Ili kuchapisha vitabu, wasilisha ombi lako na sampuli ya kazi yako kwa msimamizi ili uidhinishwe.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenApplicationModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-display font-bold text-xs rounded-xl border border-amber-700 shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-center shrink-0 flex items-center gap-1.5"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Submit Application' : 'Tuma Ombi'}</span>
          </button>
        </div>
      )}

      {userAccount?.role === 'artist' && userAccount?.status === 'suspended' && (
        <div className="max-w-5xl mx-auto w-full mb-6 p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 text-rose-900 dark:text-rose-200 flex items-start sm:items-center gap-3 shadow-md animate-fade-in">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-bold font-display text-rose-900 dark:text-rose-100">
              {language === 'en' ? 'Artist Account Suspended' : 'Akaunti ya Msanii Imesitishwa'}
            </p>
            <p className="mt-0.5 text-rose-800 dark:text-rose-300">
              {language === 'en'
                ? 'Your artist account status is currently suspended by the administrator. Public uploading and publishing are disabled.'
                : 'Akaunti yako ya msanii imesimamishwa na msimamizi. Upakiaji na uchapishaji umefungwa.'}
            </p>
          </div>
        </div>
      )}

      {/* A. SIGN-IN / SELECT PROFILE LOCK SCREEN */}
      {!activeArtistName && !isAdminMode && (
        <div className={`max-w-md mx-auto w-full rounded-3xl border-4 p-6 md:p-8 shadow-2xl mt-4 select-none text-center animate-scale-up transition-colors duration-300 ${
          isNight
            ? 'bg-stone-900 border-stone-800 text-amber-100'
            : 'bg-white/95 border-orange-200 text-amber-955 shadow-xl'
        }`}>
          {selectedArtistToUnlock ? (
            /* PIN UNLOCK CARD */
            <form onSubmit={handleVerifyUnlockPin} className="text-left space-y-4">
              <div className="text-center">
                <span className="text-5xl">🔒</span>
                <h2 className={`text-xl md:text-2xl font-display font-bold mt-4 ${isNight ? 'text-amber-100' : 'text-amber-955'}`}>
                  {language === 'en' ? 'Unlock Artist Profile' : 'Fungua Wasifu wa Msanii'}
                </h2>
                <p className={`text-xs mt-2 font-semibold ${isNight ? 'text-amber-200' : 'text-amber-900'}`}>
                  {language === 'en' ? 'Entering workspace for:' : 'Kuingia kwenye eneo la kazi la:'} <br />
                  <span className="text-sm text-amber-600 underline underline-offset-4 font-bold">{selectedArtistToUnlock}</span>
                </p>
              </div>

              {pinError && (
                <div className="bg-rose-950 text-rose-200 border-2 border-rose-800 p-3 rounded-xl text-center text-xs font-semibold animate-shake">
                  ⚠️ {pinError}
                </div>
              )}

              <div>
                <label className={`block text-xs font-display font-bold mb-1.5 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                  {language === 'en' ? 'Enter 4-Digit Security PIN:' : 'Weka PIN ya Usalama ya Tarakimu 4:'}
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  value={unlockPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setUnlockPin(val);
                    if (pinError) setPinError(null);
                  }}
                  placeholder="e.g. 1234"
                  className={`w-full text-center tracking-widest text-xl font-mono py-2.5 border-2 rounded-xl focus:border-amber-500 focus:outline-none ${
                    isNight
                      ? 'bg-stone-950 text-amber-100 border-stone-700'
                      : 'bg-amber-50/50 text-amber-955 border-amber-200'
                  }`}
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArtistToUnlock(null);
                    setUnlockPin('');
                    setPinError(null);
                    playChime('pop');
                  }}
                  className={`flex-1 py-3 font-display font-bold text-xs rounded-xl transition cursor-pointer border ${
                    isNight
                      ? 'bg-stone-800 hover:bg-stone-700 text-amber-200 border-stone-700'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                  }`}
                >
                  {language === 'en' ? 'Cancel' : 'Ghairi'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl shadow border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer transition flex items-center justify-center gap-1"
                >
                  🗝️ {language === 'en' ? 'Unlock Workbench' : 'Fungua Meza ya Kazi'}
                </button>
              </div>

              <p className={`text-[10px] text-center leading-normal mt-2 font-medium p-2 rounded-lg border ${
                isNight
                  ? 'text-amber-200/90 bg-stone-950 border-stone-800'
                  : 'text-amber-900 bg-amber-50 border-amber-200'
              }`}>
                💡 {language === 'en' ? 'Note: Preloaded curator profiles Sonia Glass and Hiroshi Sato default PIN passcode is' : 'Kumbuka: Wasifu uliopakiwa wa Sonia Glass na Hiroshi Sato una nambari ya siri ya'} <strong className="font-mono bg-amber-500 text-slate-950 px-1 py-0.5 rounded font-bold">1234</strong>
              </p>
            </form>
          ) : (
            /* SELECT & REGISTER MAIN SCREEN */
            <div>
              <span className="text-5xl">🗝️</span>
              <h2 className={`text-xl md:text-2xl font-display font-bold mt-4 ${isNight ? 'text-amber-100' : 'text-amber-955'}`}>
                {language === 'en' ? 'Creator Studio Sign-In' : 'Kuingia kwa Studio ya Mbunifu'}
              </h2>
              <p className={`text-xs md:text-sm mt-2 leading-relaxed ${isNight ? 'text-amber-200/80' : 'text-amber-900'}`}>
                {language === 'en' ? 'Artists can only see and manage their own picture books. Please select your identity or register to enter.' : 'Wasanii wanaweza tu kuona na kusimamia vitabu vyao wenyewe vya picha. Tafadhali chagua wasifu wako au ujisajili ili kuingia.'}
              </p>

              {/* Select Existing Artists */}
              {uniqueArtists.length > 0 && (
                <div className="mt-6 text-left">
                  <label className={`block text-xs font-display font-bold mb-2 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                    {language === 'en' ? 'Choose Existing Artist Profile:' : 'Chagua Wasifu wa Msanii Uliopo:'}
                  </label>
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {uniqueArtists.map((artist) => (
                      <button
                        key={artist.name}
                        type="button"
                        onClick={() => {
                          setSelectedArtistToUnlock(artist.name);
                          setUnlockPin('');
                          setPinError(null);
                          playChime('pop');
                        }}
                        className={`w-full text-left px-4 py-2.5 font-display font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-between border ${
                          isNight
                            ? 'bg-stone-950 hover:bg-stone-800 text-amber-100 border-stone-800 hover:border-amber-600'
                            : 'bg-amber-50/80 hover:bg-amber-100 text-amber-955 border-amber-200 hover:border-amber-400'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">🎨 {artist.name} <span className="text-amber-500/80 text-[10px]">🔒</span></span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                          isNight ? 'bg-amber-950 text-amber-200 border-amber-800' : 'bg-amber-200 text-amber-955 border-amber-300'
                        }`}>
                          {artist.booksCount} {artist.booksCount === 1 ? (language === 'en' ? 'book' : 'kitabu') : (language === 'en' ? 'books' : 'vitabu')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={`my-5 flex items-center justify-between gap-3 text-xs font-bold ${isNight ? 'text-stone-400' : 'text-amber-800'}`}>
                <div className={`h-0.5 flex-1 ${isNight ? 'bg-stone-800' : 'bg-amber-200'}`} />
                <span>{language === 'en' ? 'OR REGISTER NEW PROFILE' : 'AU SAJILI WASIFU MPYA'}</span>
                <div className={`h-0.5 flex-1 ${isNight ? 'bg-stone-800' : 'bg-amber-200'}`} />
              </div>

              {/* Register New Artist */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const nameInput = target.elements.namedItem('newArtistName') as HTMLInputElement;
                  const pinInput = target.elements.namedItem('newArtistPin') as HTMLInputElement;
                  const nameVal = nameInput.value.trim();
                  const pinVal = pinInput.value.trim();
                  if (nameVal && pinVal) {
                    handleRegisterArtist(nameVal, pinVal);
                  }
                }}
                className="text-left space-y-3"
              >
                <div>
                  <label className={`block text-xs font-display font-bold mb-1.5 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                    {language === 'en' ? 'Register Artist Identity Name:' : 'Sajili Jina la Msanii:'}
                  </label>
                  <input
                    name="newArtistName"
                    type="text"
                    required
                    placeholder="e.g. Kenji Sato (Woodcrafter)"
                    className={`w-full px-4 py-2.5 border-2 rounded-xl text-xs focus:border-amber-500 focus:outline-none font-medium ${
                      isNight
                        ? 'bg-stone-950 text-amber-100 border-stone-800 placeholder-stone-500'
                        : 'bg-amber-50/50 text-amber-955 border-amber-200 placeholder-amber-800/50'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-display font-bold mb-1.5 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                    {language === 'en' ? 'Set a 4-Digit Security PIN:' : 'Weka PIN ya Usalama ya Tarakimu 4:'}
                  </label>
                  <input
                    name="newArtistPin"
                    type="password"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    placeholder="e.g. 9988"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }}
                    className={`w-full px-4 py-2.5 border-2 rounded-xl text-xs focus:border-amber-500 focus:outline-none font-medium tracking-widest ${
                      isNight
                        ? 'bg-stone-950 text-amber-100 border-stone-800 placeholder-stone-500'
                        : 'bg-amber-50/50 text-amber-955 border-amber-200 placeholder-amber-800/50'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl shadow border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <span>✨</span> {language === 'en' ? 'Register & Enter Studio' : 'Sajili na Uingie Studio'}
                </button>
              </form>

              <div className={`mt-8 pt-5 border-t select-none ${isNight ? 'border-stone-800' : 'border-amber-200'}`}>
                {showAdminLogin ? (
                  <form onSubmit={handleVerifyAdminPin} className={`text-left space-y-3 p-4 rounded-2xl border animate-fade-in ${
                    isNight ? 'bg-stone-950 border-rose-900' : 'bg-rose-50/80 border-rose-300'
                  }`}>
                    <h3 className="text-xs font-display font-bold text-rose-700 flex items-center gap-1.5">
                      🔑 {language === 'en' ? 'Enter System Admin PIN' : 'Weka PIN ya Msimamizi'}
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        required
                        maxLength={4}
                        pattern="\d{4}"
                        value={adminUnlockPin}
                        onChange={(e) => {
                          setAdminUnlockPin(e.target.value.replace(/\D/g, ''));
                          if (adminPinError) setAdminPinError(null);
                        }}
                        placeholder="e.g. 9999"
                        className="flex-1 px-4 py-2 bg-white text-slate-900 border-2 border-rose-300 rounded-xl text-center text-sm font-mono tracking-widest focus:border-rose-500 focus:outline-none placeholder-stone-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-xs rounded-xl shadow cursor-pointer transition flex-shrink-0"
                      >
                        {language === 'en' ? 'Verify' : 'Hakiki'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAdminLogin(false); setAdminUnlockPin(''); setAdminPinError(null); playChime('pop'); }}
                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-955 font-display font-bold text-xs rounded-xl cursor-pointer transition flex-shrink-0 border border-amber-300"
                      >
                        {language === 'en' ? 'Cancel' : 'Ghairi'}
                      </button>
                    </div>
                    {adminPinError && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1">⚠️ {adminPinError}</p>
                    )}
                    <p className="text-[9px] text-rose-800 leading-normal">
                      💡 {language === 'en' ? 'Note: System administration profile passcode is' : 'Kumbuka: PIN ya wasifu wa msimamizi ni'} <strong className="font-mono bg-rose-200 px-1 py-0.5 rounded text-rose-950 font-bold">9999</strong>
                    </p>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowAdminLogin(true); playChime('sparkle'); }}
                    className={`w-full py-2.5 font-display font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      isNight
                        ? 'bg-stone-950 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border-stone-800 hover:border-rose-800'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    🔑 {language === 'en' ? 'Access System Admin Portal' : 'Nenda Kwenye Portal ya Admin'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* C. ADMIN MODERATION CONSOLE */}
      {isAdminMode && viewMode !== 'editor' && (
        <div className="max-w-5xl mx-auto w-full animate-scale-up space-y-6">
          {/* Admin Header Banner */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 md:p-8 rounded-3xl border-3 border-red-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 select-none">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-red-950 flex items-center gap-2">
                🔒 {language === 'en' ? 'System Moderation Console' : 'Console ya Msimamizi wa Mfumo'}
              </h2>
              <p className="text-xs md:text-sm text-red-900 mt-1 max-w-xl font-medium">
                {language === 'en' 
                  ? 'Administrator dashboard. Monitor and delete harmful content, reset artist security credentials, and moderate children/student profiles.'
                  : 'Meza ya usimamizi. Kagua na ufute maudhui yasiyofaa, badilisha PIN za wasanii, na udhibiti wasifu wa wanafunzi.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsAdminMode(false);
                  localStorage.removeItem('digipicture_is_admin');
                  playChime('bubble');
                }}
                className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white hover:text-white font-display font-bold text-xs shadow transition cursor-pointer flex items-center gap-1.5 border-none"
              >
                🔒 {language === 'en' ? 'Exit Admin Panel' : 'Ondoka Kwenye Admin'}
              </button>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex gap-2 border-b border-orange-200 pb-3 select-none">
            <button
              type="button"
              onClick={() => { setAdminTab('artists'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                adminTab === 'artists'
                  ? 'bg-red-600 text-white border-b-2 border-red-800 shadow-sm'
                  : 'bg-white border border-orange-250 text-amber-955 hover:bg-orange-50'
              }`}
            >
              🎨 {language === 'en' ? 'Manage Artists' : 'Wasanii'} ({Object.keys(artistPins).length})
            </button>
            <button
              type="button"
              onClick={() => { setAdminTab('books'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                adminTab === 'books'
                  ? 'bg-red-600 text-white border-b-2 border-red-800 shadow-sm'
                  : 'bg-white border border-orange-250 text-amber-955 hover:bg-orange-50'
              }`}
            >
              📚 {language === 'en' ? 'Manage Books' : 'Vitabu'} ({booksList.length})
            </button>
            <button
              type="button"
              onClick={() => { setAdminTab('subscribers'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                adminTab === 'subscribers'
                  ? 'bg-red-600 text-white border-b-2 border-red-800 shadow-sm'
                  : 'bg-white border border-orange-250 text-amber-955 hover:bg-orange-50'
              }`}
            >
              👥 {language === 'en' ? 'Manage Children' : 'Wanafunzi'} ({subscribers.length})
            </button>
          </div>

          {/* TAB 1: ARTISTS */}
          {adminTab === 'artists' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border-4 border-orange-100 p-6 shadow-sm">
                <h3 className="font-display font-bold text-sm text-amber-955 mb-2 flex items-center gap-2">
                  🎨 {language === 'en' ? 'Artist Profiles Directory' : 'Wasifu wa Wasanii'}
                </h3>
                <p className="text-xs text-amber-850 mb-5">
                  {language === 'en'
                    ? 'All registered artist accounts. You can reset their security PIN if forgotten, or completely remove inappropriate accounts.'
                    : 'Akaunti zote za wasanii. Unaweza kubadilisha PIN zao zilizosahaulika, au kufuta akaunti zisizofaa.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(artistPins) as Array<[string, string]>).map(([name, pin]) => {
                    const artistBooksCount = booksList.filter(b => (b.author || '').trim().toLowerCase() === name.trim().toLowerCase()).length;
                    return (
                      <div key={name} className="p-4 rounded-2xl border bg-gray-50/50 hover:bg-gray-50 border-gray-150 flex flex-col justify-between gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-display font-bold text-xs sm:text-sm text-amber-955">
                              {name}
                            </h4>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              📄 {artistBooksCount} {artistBooksCount === 1 ? 'book' : 'books'} on shelf
                            </p>
                          </div>
                          <span className="text-xs font-mono bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md border border-red-150">
                            PIN: {pin}
                          </span>
                        </div>

                        <div className="flex gap-2 border-t border-dashed border-gray-200 pt-3">
                          <button
                            onClick={() => {
                              const newPin = window.prompt(
                                language === 'en' 
                                  ? `Enter new 4-digit PIN for ${name}:` 
                                  : `Weka PIN mpya ya tarakimu 4 ya ${name}:`, 
                                pin
                              );
                              if (newPin !== null) {
                                handleAdminResetPin(name, newPin);
                              }
                            }}
                            className="flex-1 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-display font-bold text-[10px] rounded-lg cursor-pointer transition text-center"
                          >
                            🗝️ {language === 'en' ? 'Reset PIN' : 'Badilisha PIN'}
                          </button>
                          <button
                            onClick={() => handleAdminDeleteArtist(name)}
                            className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-display font-bold text-[10px] rounded-lg cursor-pointer transition text-center border border-red-250"
                          >
                            🗑️ {language === 'en' ? 'Delete Profile' : 'Futa Wasifu'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKS */}
          {adminTab === 'books' && (
            <div className="bg-white rounded-3xl border-4 border-orange-100 p-6 shadow-sm">
              <h3 className="font-display font-bold text-sm text-amber-955 mb-2 flex items-center gap-2">
                📚 {language === 'en' ? 'Active Digital Bookshelf Catalog' : 'Katalogi ya Vitabu kwenye Rafu'}
              </h3>
              <p className="text-xs text-amber-850 mb-5">
                {language === 'en'
                  ? 'All published items currently live on the kids library shelf. Delete and moderate harmful or low-quality books immediately.'
                  : 'Vitabu vyote vilivyochapishwa sasa kwenye maktaba ya watoto. Futa na udhibiti vitabu visivyofaa au vibaya mara moja.'}
              </p>

              {booksList.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No books in catalog.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {booksList.map((book) => (
                    <div key={book.id} className="p-4 rounded-2xl border bg-gray-50/50 border-gray-150 flex gap-3">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-16 h-20 object-contain rounded-xl border border-gray-200 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          <h4 className="font-display font-bold text-xs sm:text-sm text-amber-955 truncate" title={book.title}>
                            {book.title}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-semibold mt-0.5 truncate">
                            By {book.author || 'Unknown'}
                          </p>
                          <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-150 text-gray-700">
                            {book.isCustom ? 'User Content' : 'System Default'}
                          </span>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-dashed border-gray-150/50 mt-1">
                          <button
                            onClick={() => {
                              const confirmDel = window.confirm(
                                language === 'en'
                                  ? `Are you sure you want to delete "${book.title}" from the catalog? This is permanent.`
                                  : `Je, una uhakika unataka kufuta "${book.title}" kwenye katalogi? Hatua hii hairejesheki.`
                              );
                              if (confirmDel) {
                                onDeleteBook(book.id);
                              }
                            }}
                            className="py-1 px-3 bg-red-650 hover:bg-red-700 text-white hover:text-white font-display font-bold text-[9px] rounded-lg cursor-pointer transition flex items-center gap-1 shadow-sm border-none"
                          >
                            <Trash2 className="w-3 h-3" />
                            {language === 'en' ? 'Delete Harmful Book' : 'Futa Kitabu'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHILDREN / SUBSCRIBERS */}
          {adminTab === 'subscribers' && (
            <div className="bg-white rounded-3xl border-4 border-orange-100 p-6 shadow-sm">
              <h3 className="font-display font-bold text-sm text-amber-955 mb-2 flex items-center gap-2">
                👥 {language === 'en' ? 'Student Subscriber Directory' : 'Saraka ya Wanafunzi Waliojisajili'}
              </h3>
              <p className="text-xs text-amber-850 mb-5">
                {language === 'en'
                  ? 'All children and students profiles. Review subscriber names to filter out any inappropriate language or nicknames.'
                  : 'Wasifu wa watoto na wanafunzi wote waliojisajili. Kagua majina ili kufuta lugha isiyofaa au majina mabaya.'}
              </p>

              {subscribers.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-250 rounded-2xl bg-gray-50/50">
                  <span className="text-3xl">🦁</span>
                  <p className="text-xs text-gray-500 mt-2">No active student subscribers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subscribers.map((sub) => (
                    <div key={sub.id} className="p-4 rounded-2xl border bg-gray-50/50 border-gray-150 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0">
                        {sub.avatar || '🦊'}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-display font-bold text-xs text-amber-955 truncate">
                          {sub.studentName}
                        </h4>
                        <p className="text-[9px] text-gray-500 font-medium">
                          Subscribed to <strong className="text-orange-600">{sub.artistName}</strong>
                        </p>
                        <p className="text-[8px] text-gray-400 font-mono mt-0.5">
                          {new Date(sub.subscribedAt).toLocaleDateString()}
                        </p>
                        <div className="flex justify-end mt-2 pt-2 border-t border-dashed border-gray-150/50">
                          <button
                            onClick={() => {
                              const confirmDel = window.confirm(
                                language === 'en'
                                  ? `Remove student subscriber "${sub.studentName}"?`
                                  : `Futa wasifu wa mwanafunzi "${sub.studentName}"?`
                              );
                              if (confirmDel) {
                                onDeleteSubscriber(sub.id);
                              }
                            }}
                            className="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-display font-bold text-[9px] rounded-lg cursor-pointer border border-red-200 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

        {/* B. ARTIST MAIN WORKSPACE (DASHBOARD FOR THE SIGNED-IN ARTIST) */}
      {activeArtistName && viewMode !== 'editor' && (
        <div className="max-w-5xl mx-auto w-full animate-scale-up">
          
          {/* Dashboard Header Banner */}
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl border-2 shadow-sm mb-6 select-none transition-colors duration-300 ${
            isNight
              ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100'
              : 'bg-gradient-to-r from-amber-100/90 via-orange-50 to-amber-100/90 border-amber-200 text-amber-955 shadow-xs'
          }`}>
            <div>
              <h2 className={`text-xl md:text-2xl font-display font-bold flex items-center gap-2.5 flex-wrap ${
                isNight ? 'text-amber-200' : 'text-amber-955'
              }`}>
                <span>Welcome Back, {activeArtistName}!</span>
                {isApprovedArtist && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold" title="Verified Approved Artist">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'en' ? 'Verified Artist' : 'Msanii Aliyeidhinishwa'}</span>
                  </span>
                )}
              </h2>
              <p className={`text-xs md:text-sm font-medium leading-relaxed italic mt-2 max-w-xl ${
                isNight ? 'text-slate-300' : 'text-amber-900'
              }`}>
                "{profileBio || userAccount?.bio || 'Passionate artist and children storybook creator crafting magical visual learning experiences.'}"
              </p>
            </div>
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar shrink-0 self-start md:self-auto">
              {!isApprovedArtist && (
                <button
                  onClick={handleOpenApplicationModal}
                  className={`border-2 font-display font-bold text-[11px] sm:text-xs px-3.5 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl shadow-sm active:scale-95 cursor-pointer transition flex items-center gap-2 whitespace-nowrap text-nowrap shrink-0 ${
                    isPendingArtist
                      ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700 shadow-amber-500/20'
                      : isRejectedArtist
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-500/20'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600'
                  }`}
                  id="artist-application-button"
                  title="Artist Verification Application Status"
                >
                  {isPendingArtist ? (
                    <>
                      <Clock className="w-4 h-4 text-white" />
                      <span>{language === 'en' ? 'Pending Review' : 'Inasubiri Ukaguzi'}</span>
                    </>
                  ) : isRejectedArtist ? (
                    <>
                      <XCircle className="w-4 h-4 text-white" />
                      <span>{language === 'en' ? 'Declined - Re-apply' : 'Kataliwa - Omba Tena'}</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 text-slate-950" />
                      <span>{language === 'en' ? 'Apply as Artist' : 'Ombi la Usajili'}</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => handleOpenArtistShare('portfolio')}
                className={`border-2 font-display font-bold text-[11px] sm:text-xs px-2.5 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl shadow-xs active:scale-95 cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap text-nowrap shrink-0 ${
                  isNight
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700 hover:border-amber-500'
                    : 'bg-white hover:bg-amber-100/80 text-amber-955 border-amber-300 hover:border-amber-500'
                }`}
                id="portfolio-share-all-button"
                title="Share my artist profile & portfolio to social media"
              >
                <Share2 className={`w-4 h-4 ${isNight ? 'text-amber-400' : 'text-orange-600'}`} />
                <span>{language === 'en' ? 'Share My Portfolio' : 'Gawanya Portfolio Yangu'}</span>
              </button>
              <button
                onClick={startNewBook}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-display font-bold text-[11px] sm:text-xs px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl shadow border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap text-nowrap shrink-0"
                id="portfolio-create-new-button"
              >
                <Plus className="w-4 h-4 text-slate-950" /> Create New Picture Book
              </button>
            </div>
          </div>

          {/* Dashboard Tabs */}
          <div className={`flex gap-2 border-b pb-3 mb-6 select-none overflow-x-auto ${
            isNight ? 'border-slate-800' : 'border-amber-200'
          }`}>
            <button
              type="button"
              onClick={() => { setDashboardTab('books'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                dashboardTab === 'books'
                  ? 'bg-amber-500 text-slate-955 border-b-2 border-amber-700 shadow-sm'
                  : (isNight
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'bg-white border border-amber-200 text-amber-955 hover:bg-amber-100/60')
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>My Books ({myBooks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setDashboardTab('subscribers'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                dashboardTab === 'subscribers'
                  ? 'bg-amber-500 text-slate-955 border-b-2 border-amber-700 shadow-sm'
                  : (isNight
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'bg-white border border-amber-200 text-amber-955 hover:bg-amber-100/60')
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Student Subscribers ({mySubscribers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setDashboardTab('messages'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                dashboardTab === 'messages'
                  ? 'bg-amber-500 text-slate-955 border-b-2 border-amber-700 shadow-sm'
                  : (isNight
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'bg-white border border-amber-200 text-amber-955 hover:bg-amber-100/60')
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Messages & Feedback ({directMessages.length + Object.values(bookReviews).reduce((acc, curr) => acc + curr.length, 0)})</span>
            </button>
            <button
              type="button"
              onClick={() => { setDashboardTab('storage'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                dashboardTab === 'storage'
                  ? 'bg-amber-500 text-slate-955 border-b-2 border-amber-700 shadow-sm'
                  : (isNight
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'bg-white border border-amber-200 text-amber-955 hover:bg-amber-100/60')
              }`}
              id="dashboard-storage-tab-btn"
            >
              <FolderArchive className="w-4 h-4" />
              <span>File Storage & Assets ({userFiles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setDashboardTab('profile'); playChime('pop'); }}
              className={`px-4 py-2 rounded-xl font-display font-bold text-xs transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                dashboardTab === 'profile'
                  ? 'bg-amber-500 text-slate-955 border-b-2 border-amber-700 shadow-sm'
                  : (isNight
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'bg-white border border-amber-200 text-amber-955 hover:bg-amber-100/60')
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Profile & Studio Settings</span>
            </button>
          </div>

          {/* Tab 1: Books */}
          {dashboardTab === 'books' && (
            <div>
              {myBooks.length === 0 ? (
                <div className={`flex flex-col items-center justify-center text-center p-12 rounded-3xl border-2 border-dashed select-none ${
                  isNight
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-white/90 border-amber-200 text-amber-955 shadow-xs'
                }`}>
                  <span className="text-5xl mb-3 animate-pulse">📚</span>
                  <h4 className={`font-display font-bold text-sm ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>No books published yet!</h4>
                  <p className={`text-xs mt-1 max-w-sm leading-relaxed ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                    Start publishing beautiful digital stories for children. Click the <strong className="text-orange-600">Create New Picture Book</strong> button to write your first book and design watercolors, clay models, and fabric sheets!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myBooks.map((book) => (
                    <div
                      key={book.id}
                      className={`rounded-3xl border-2 overflow-hidden shadow-xs transition flex flex-col sm:flex-row gap-4 p-5 ${
                        isNight
                          ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                          : 'bg-white/95 border-amber-200 text-amber-955 hover:border-amber-300 shadow-sm'
                      }`}
                    >
                      {/* Book Cover */}
                      <div className={`w-full sm:w-1/3 aspect-[4/5] sm:h-full rounded-2xl overflow-hidden border flex-shrink-0 shadow-inner relative ${
                        isNight ? 'bg-slate-955 border-slate-800' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className={`absolute inset-x-0 bottom-0 py-1 text-center text-[9px] font-bold tracking-wider uppercase select-none ${
                          isNight ? 'bg-slate-955/80 text-amber-300 backdrop-blur-xs' : 'bg-amber-100/90 text-amber-955 backdrop-blur-xs'
                        }`}>
                          {book.isCustom ? 'User Design' : 'Curator Book'}
                        </div>
                      </div>

                      {/* Book Metadata & Actions */}
                      <div className="flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h3 className={`font-display font-bold text-sm uppercase leading-snug tracking-tight truncate ${
                            isNight ? 'text-amber-100' : 'text-amber-955'
                          }`}>
                            {book.title}
                          </h3>
                          <p className={`text-[11px] mt-1 font-medium line-clamp-3 leading-relaxed ${
                            isNight ? 'text-slate-300' : 'text-amber-900'
                          }`}>
                            {book.description}
                          </p>
                          
                          {/* Tags & Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {book.status === 'draft' ? (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                isNight ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-amber-100 text-amber-900 border-amber-200'
                              }`}>
                                Draft (Private)
                              </span>
                            ) : book.status === 'flagged' ? (
                              <span className="text-[9px] font-bold bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">
                                Flagged & Hidden
                              </span>
                            ) : (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                isNight ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}>
                                Published
                              </span>
                            )}

                            {book.contributors && book.contributors.length > 1 && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                isNight ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-900 border-purple-300'
                              }`}>
                                {book.contributors.length} Artists
                              </span>
                            )}

                            {book.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                  isNight ? 'bg-slate-955 text-amber-300 border-slate-800' : 'bg-amber-50 text-amber-900 border-amber-200'
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                              isNight ? 'bg-orange-950 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-900 border-orange-200'
                            }`}>
                              {book.pages.length} {book.pages.length === 1 ? 'Page' : 'Pages'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={`flex flex-col gap-2 pt-3 border-t ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
                          <button
                            onClick={() => handleOpenArtistShare('book', book)}
                            className={`w-full py-2 font-display font-bold text-xs rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
                              isNight
                                ? 'bg-indigo-955 hover:bg-indigo-900 text-indigo-200 border-indigo-800'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-indigo-200'
                            }`}
                            id={`share-book-btn-${book.id}`}
                          >
                            <Share2 className={`w-3.5 h-3.5 ${isNight ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            {language === 'en' ? 'Share Story on Social Media' : 'Gawanya Hadithi Mtandaoni'}
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => startEditingBook(book)}
                              className="py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-955 font-display font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                              id={`edit-book-btn-${book.id}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Edit' : 'Hariri'}</span>
                            </button>
                            <button
                              onClick={() => startAddPagesForBook(book)}
                              className={`py-2 font-display font-bold text-xs rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
                                isNight
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                              }`}
                              id={`add-page-btn-${book.id}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Pages' : 'Kurasa'}</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setBookToDelete(book);
                              playChime('pop');
                            }}
                            className={`w-full py-2 font-display font-bold text-xs rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
                              isNight
                                ? 'bg-rose-955/80 hover:bg-rose-900 text-rose-200 border-rose-800'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
                            }`}
                            id={`delete-book-btn-${book.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>{language === 'en' ? 'Delete Book' : 'Futa Kitabu'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Subscribers */}
          {dashboardTab === 'subscribers' && (
            <div>
              <div className={`p-6 rounded-3xl border-2 shadow-sm mb-6 select-none ${
                isNight
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : 'bg-white/90 border-amber-200 text-amber-955'
              }`}>
                <h3 className={`font-display font-bold text-sm flex items-center gap-2 ${
                  isNight ? 'text-amber-200' : 'text-amber-955'
                }`}>
                  👥 My Student Subscribers Directory
                </h3>
                <p className={`text-xs mt-1 font-medium ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                  Here are all the students and learners who have joined your creative club to follow your digital storytelling and art form guides!
                </p>
              </div>

              {mySubscribers.length === 0 ? (
                <div className={`flex flex-col items-center justify-center text-center p-12 rounded-3xl border-2 border-dashed select-none ${
                  isNight
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-white/90 border-amber-200 text-amber-955'
                }`}>
                  <span className="text-5xl mb-3 animate-pulse">🦁</span>
                  <h4 className={`font-display font-bold text-sm ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>No subscribers yet!</h4>
                  <p className={`text-xs mt-1 max-w-sm leading-relaxed ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                    Keep creating lovely interactive pages using watercolors, clay structures, and woolly paper craft. Students will subscribe while reading your storybooks!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mySubscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className={`rounded-2xl p-5 border-2 shadow-xs transition flex items-start gap-4 ${
                        isNight
                          ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                          : 'bg-white/95 border-amber-200 text-amber-955 hover:border-amber-300 shadow-sm'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shadow-inner flex-shrink-0 font-display ${
                        isNight ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-955'
                      }`}>
                        {sub.avatar || '🦊'}
                      </div>
                      
                      {/* Subscriber Info */}
                      <div className="overflow-hidden">
                        <h4 className={`font-display font-bold text-xs sm:text-sm truncate leading-tight ${
                          isNight ? 'text-amber-100' : 'text-amber-955'
                        }`}>
                          {sub.studentName}
                        </h4>
                        <p className="text-[10px] text-orange-600 font-bold uppercase mt-1">
                          🎨 Loves: {sub.favoriteArtForm}
                        </p>
                        
                        {sub.bookTitle && (
                          <p className={`text-[10px] mt-1.5 truncate font-medium ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                            📖 From: <strong className="italic text-orange-600">{sub.bookTitle}</strong>
                          </p>
                        )}
                        
                        <p className={`text-[9px] font-mono mt-1 ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>
                          Joined: {new Date(sub.subscribedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Reader Direct Messages & Picturebook Feedback */}
          {dashboardTab === 'messages' && (
            <div className="space-y-6 text-left animate-fade-in select-none">
              <div className={`p-4 sm:p-5 rounded-3xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                isNight
                  ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100'
                  : 'bg-gradient-to-r from-amber-100/90 via-orange-50 to-amber-100/90 border-amber-200 text-amber-955 shadow-xs'
              }`}>
                <div>
                  <h3 className={`font-display font-bold text-sm sm:text-base flex items-center gap-2 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    <span>💬</span>
                    <span>{language === 'en' ? 'Reader Messages & Story Feedback' : 'Ujumbe na Maoni kutoka kwa Wasomaji'}</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                    {language === 'en'
                      ? 'Read warm notes, questions, and star ratings sent directly by students, parents, and teachers!'
                      : 'Soma ujumbe wa pongezi, maswali na nyota zilizotumwa na wanafunzi na wazazi!'}
                  </p>
                </div>
                <div className="bg-amber-500 text-slate-955 font-extrabold text-xs px-3 py-1.5 rounded-2xl shadow-2xs border border-amber-600">
                  {directMessages.length + Object.values(bookReviews).reduce((acc, curr) => acc + curr.length, 0)} {language === 'en' ? 'Total Received' : 'Jumla Zilizopokelewa'}
                </div>
              </div>

              {/* Direct Messages Section */}
              <div className="space-y-3">
                <h4 className={`font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b pb-2 ${
                  isNight ? 'text-amber-100 border-slate-800' : 'text-amber-955 border-amber-200'
                }`}>
                  <span>✉️</span>
                  <span>{language === 'en' ? 'Direct Messages' : 'Ujumbe wa Moja kwa Moja'} ({directMessages.length})</span>
                </h4>

                {directMessages.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl border-2 border-dashed ${
                    isNight
                      ? 'bg-slate-900 border-slate-800 text-slate-100'
                      : 'bg-white/90 border-amber-200 text-amber-955'
                  }`}>
                    <span className="text-4xl mb-2 block">📬</span>
                    <p className={`font-display font-bold text-xs ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>{language === 'en' ? 'No direct messages received yet.' : 'Hujaokota ujumbe wa moja kwa moja bado.'}</p>
                    <p className={`text-[11px] mt-1 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>{language === 'en' ? 'Messages sent by readers from your picturebooks will appear here.' : 'Ujumbe wowote utakotumwa na wasomaji utaonekana hapa.'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {directMessages.map((msg) => (
                      <div key={msg.id} className={`p-4 rounded-2xl border-2 shadow-xs transition space-y-2 relative ${
                        isNight
                          ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                          : 'bg-white/95 border-amber-200 text-amber-955 hover:border-amber-300 shadow-sm'
                      }`}>
                        <div className={`flex items-center justify-between border-b pb-2 ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                              isNight ? 'bg-slate-800 text-amber-300 border-slate-700' : 'bg-amber-100 text-amber-955 border-amber-300'
                            }`}>
                              {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '👤'}
                            </div>
                            <div>
                              <h5 className={`font-display font-bold text-xs leading-tight ${isNight ? 'text-amber-100' : 'text-amber-955'}`}>{msg.senderName}</h5>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                                  isNight ? 'text-orange-300 bg-slate-955 border-slate-800' : 'text-orange-800 bg-orange-100 border-orange-200'
                                }`}>
                                  {msg.senderRole || 'Reader'}
                                </span>
                                {msg.senderEmail && (
                                  <span className={`text-[10px] font-mono ${isNight ? 'text-amber-300' : 'text-amber-800'}`}>
                                    ✉️ {msg.senderEmail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[9px] font-mono ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>{msg.timestamp || (msg as any).sentAt}</span>
                        </div>

                        {msg.bookTitle && (
                          <div className={`text-[10px] font-bold p-1.5 rounded-lg border ${
                            isNight ? 'text-amber-300 bg-slate-955 border-slate-800' : 'text-amber-955 bg-amber-50 border-amber-200'
                          }`}>
                            📖 {language === 'en' ? 'Regarding:' : 'Kuhusu:'} <span className="italic">{msg.bookTitle}</span>
                          </div>
                        )}

                        <p className={`text-xs leading-relaxed font-sans p-2.5 rounded-xl border ${
                          isNight ? 'text-slate-200 bg-slate-955/80 border-slate-800' : 'text-amber-955 bg-amber-50/50 border-amber-200'
                        }`}>
                          "{msg.message}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Book Reviews & Ratings Section */}
              <div className="space-y-3 pt-2">
                <h4 className={`font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b pb-2 ${
                  isNight ? 'text-amber-100 border-slate-800' : 'text-amber-955 border-amber-200'
                }`}>
                  <span>⭐</span>
                  <span>{language === 'en' ? 'Book Reviews & Reader Star Ratings' : 'Tathmini na Nyota za Vitabu'} ({Object.values(bookReviews).reduce((acc, curr) => acc + curr.length, 0)})</span>
                </h4>

                {Object.keys(bookReviews).length === 0 || Object.values(bookReviews).every(arr => arr.length === 0) ? (
                  <div className={`p-8 text-center rounded-2xl border-2 border-dashed ${
                    isNight
                      ? 'bg-slate-900 border-slate-800 text-slate-100'
                      : 'bg-white/90 border-amber-200 text-amber-955'
                  }`}>
                    <span className="text-4xl mb-2 block">🌟</span>
                    <p className={`font-display font-bold text-xs ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>{language === 'en' ? 'No story reviews yet.' : 'Hakuna tathmini bado.'}</p>
                    <p className={`text-[11px] mt-1 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>{language === 'en' ? 'Star ratings left by children and educators will be showcased here.' : 'Nyota na maoni ya wasomaji yataonekana hapa.'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(bookReviews).map(([bookId, reviews]) => {
                      if (reviews.length === 0) return null;
                      const bookObj = booksList.find(b => b.id === bookId);
                      return (
                        <div key={bookId} className={`p-4 rounded-2xl border space-y-3 ${
                          isNight ? 'bg-slate-955/60 border-slate-800' : 'bg-amber-50/60 border-amber-200'
                        }`}>
                          <div className={`flex items-center justify-between border-b pb-2 ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
                            <h5 className={`font-display font-bold text-xs flex items-center gap-1.5 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                              <span>📖</span>
                              <span>{bookObj ? bookObj.title : `Book #${bookId}`}</span>
                            </h5>
                            <span className="text-[10px] bg-amber-500 text-slate-955 font-extrabold px-2 py-0.5 rounded-full border border-amber-600">
                              {reviews.length} {language === 'en' ? 'Reviews' : 'Tathmini'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {reviews.map((rev) => (
                              <div key={rev.id} className={`p-3 rounded-xl border shadow-2xs space-y-1.5 ${
                                isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-amber-200 text-amber-955'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-display font-bold text-xs ${isNight ? 'text-amber-100' : 'text-amber-955'}`}>{rev.reviewerName}</span>
                                    <span className="text-[9px] bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full border border-emerald-800">
                                      {rev.reviewerRole}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : (isNight ? 'text-slate-600 fill-slate-800' : 'text-amber-200 fill-amber-100')}`} />
                                    ))}
                                  </div>
                                </div>
                                <p className={`text-xs italic ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>"{rev.comment}"</p>
                                <p className={`text-[9px] font-mono text-right ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>{rev.date || (rev as any).createdAt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 4: Firebase Storage & File Management */}
          {dashboardTab === 'storage' && (
            <div className="space-y-6 text-left animate-fade-in" id="workbench-file-storage-section">
              
              {/* Upload Dropzone & Controls Panel */}
              <div className={`p-5 rounded-3xl border-2 shadow-xs space-y-4 ${
                isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white/95 border-amber-200 text-amber-955'
              }`}>
                <div className="flex items-center justify-between border-b pb-2.5">
                  <h4 className={`font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    <UploadCloud className="w-4 h-4 text-orange-600" />
                    <span>{language === 'en' ? 'Upload Files to Personal Storage' : 'Pakia Faili Kwenye Hifadhi Yako'}</span>
                  </h4>
                  <span className="text-[10px] text-orange-600 font-bold">
                    Max 25MB • JPG, PNG, WEBP, GIF, SVG, MP4, MP3
                  </span>
                </div>

                {/* Upload Status Banner */}
                {uploadProgressMsg && (
                  <div className={`p-3 rounded-2xl border text-xs font-display font-bold flex items-center gap-2 animate-fade-in ${
                    uploadProgressMsg.startsWith('❌')
                      ? 'bg-rose-950 border-rose-800 text-rose-200'
                      : 'bg-emerald-950 border-emerald-600 text-emerald-200'
                  }`}>
                    <span>{uploadProgressMsg}</span>
                  </div>
                )}

                {/* Drag & Drop Area */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFileInStorage(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingFileInStorage(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFileInStorage(false);
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) {
                      handleUploadFileToStorage(droppedFile);
                    }
                  }}
                  onClick={() => storageFileInputRef.current?.click()}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 select-none ${
                    isDraggingFileInStorage
                      ? 'border-amber-500 bg-amber-500/20 scale-[1.01]'
                      : (isNight
                          ? 'border-slate-700 bg-slate-955/60 hover:bg-slate-800/60 hover:border-amber-500/60'
                          : 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 hover:border-amber-500')
                  }`}
                >
                  <input
                    ref={storageFileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadFileToStorage(file);
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-orange-600 flex items-center justify-center text-2xl">
                    {isUploadingFile ? <Loader2 className="w-6 h-6 animate-spin text-orange-600" /> : <UploadCloud className="w-6 h-6 text-orange-600" />}
                  </div>
                  <div>
                    <p className={`font-display font-bold text-xs sm:text-sm ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                      {isUploadingFile
                        ? (language === 'en' ? 'Uploading to Firebase Storage...' : 'Inapakia kwenye hifadhi...')
                        : (language === 'en' ? 'Click to browse or drag & drop files here' : 'Bonyeza kuchagua au kokota faili hapa')}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>
                      {language === 'en' ? 'Files are saved to your personal directory and synced with Firestore metadata' : 'Faili zinahifadhiwa kwenye saraka yako na kusawazishwa'}
                    </p>
                  </div>
                </div>

                {/* Optional Metadata Fields: Notes, Category, AI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className={`block text-[11px] font-display font-bold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                      Category:
                    </label>
                    <select
                      value={fileUploadCategory}
                      onChange={(e) => setFileUploadCategory(e.target.value as any)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-semibold focus:outline-none focus:border-amber-500 ${
                        isNight ? 'bg-slate-955 border-slate-800 text-slate-100' : 'bg-amber-50/60 border-amber-200 text-amber-955'
                      }`}
                    >
                      <option value="artwork">🎨 Artwork / Illustration</option>
                      <option value="cover">📖 Storybook Cover</option>
                      <option value="sample">🖼️ Sample Portfolio Piece</option>
                      <option value="video">🎬 Animation / Video</option>
                      <option value="audio">🎙️ Audio / Voice Narration</option>
                      <option value="general">📁 General Asset</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-[11px] font-display font-bold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                      Notes & Description (Optional):
                    </label>
                    <input
                      type="text"
                      value={fileUploadNotes}
                      onChange={(e) => setFileUploadNotes(e.target.value)}
                      placeholder={language === 'en' ? "e.g. Chapter 1 Forest scene background watercolor" : "Maelezo ya ziada ya faili..."}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-amber-500 ${
                        isNight ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-amber-50/60 border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Search & Category Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                  {[
                    { id: 'all', label: 'All Files' },
                    { id: 'artwork', label: '🎨 Artworks' },
                    { id: 'cover', label: '📖 Covers' },
                    { id: 'sample', label: '🖼️ Samples' },
                    { id: 'video', label: '🎬 Videos' },
                    { id: 'audio', label: '🎙️ Audio' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setFileCategoryFilter(tab.id); playChime('pop'); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition cursor-pointer whitespace-nowrap ${
                        fileCategoryFilter === tab.id
                          ? 'bg-amber-500 text-slate-955 border border-amber-600 shadow-2xs'
                          : (isNight
                              ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              : 'bg-white hover:bg-amber-100 border border-amber-200 text-amber-955')
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative min-w-[180px] sm:min-w-[220px] flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      placeholder={language === 'en' ? "Search files, notes..." : "Tafuta faili, maelezo..."}
                      className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-amber-500 ${
                        isNight ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFilesLoading(true);
                      fetchUserFilesFromFirestore(effectiveUid).then((files) => {
                        setUserFiles(files);
                        setIsFilesLoading(false);
                        playChime('pop');
                      });
                    }}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center text-xs font-bold shrink-0 ${
                      isNight
                        ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                        : 'bg-white hover:bg-amber-100 border-amber-200 text-amber-955'
                    }`}
                    title="Refresh Files List"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFilesLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Uploaded Files History List / Grid */}
              {(() => {
                const filteredFiles = userFiles.filter((file) => {
                  const matchesCategory = fileCategoryFilter === 'all' || file.category === fileCategoryFilter;
                  const q = fileSearchQuery.toLowerCase().trim();
                  const matchesSearch = !q || (
                    (file.fileName || '').toLowerCase().includes(q) ||
                    (file.notes || '').toLowerCase().includes(q) ||
                    (file.aiSummaries || '').toLowerCase().includes(q) ||
                    (file.fileId || '').toLowerCase().includes(q)
                  );
                  return matchesCategory && matchesSearch;
                });

                if (filteredFiles.length === 0) {
                  return (
                    <div className={`p-10 text-center rounded-3xl border-2 border-dashed select-none ${
                      isNight
                        ? 'bg-slate-900 border-slate-800 text-slate-100'
                        : 'bg-white/90 border-amber-200 text-amber-955'
                    }`}>
                      <span className="text-4xl mb-2 block">📁</span>
                      <h4 className={`font-display font-bold text-xs sm:text-sm ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                        {language === 'en' ? 'No files found in storage' : 'Hakuna faili zilizopatikana kwenye hifadhi'}
                      </h4>
                      <p className={`text-[11px] mt-1 ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>
                        {userFiles.length === 0
                          ? (language === 'en' ? 'Upload illustrations, book covers, or videos above to build your cloud asset library.' : 'Pakia vielelezo au picha ili kujenga maktaba yako.')
                          : (language === 'en' ? 'Try adjusting your search or category filter.' : 'Jaribu kurekebisha utafutaji wako.')}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFiles.map((file) => {
                      const isImage = file.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(file.fileName);
                      const isVideo = file.contentType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.fileName);
                      const isAudio = file.contentType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(file.fileName);

                      return (
                        <div
                          key={file.fileId}
                          className={`p-4 rounded-2xl border-2 shadow-xs space-y-3 flex flex-col justify-between transition hover:shadow-md ${
                            isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-amber-200 text-amber-955'
                          }`}
                        >
                          {/* File Preview Header */}
                          <div className="space-y-2">
                            <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950/20 border flex items-center justify-center relative group">
                              {isImage ? (
                                <img
                                  src={file.fileUrl}
                                  alt={file.fileName}
                                  className="w-full h-full object-contain p-1 group-hover:scale-105 transition duration-300"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as any).src = 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400';
                                  }}
                                />
                              ) : isVideo ? (
                                <video
                                  src={file.fileUrl}
                                  className="w-full h-full object-contain p-1"
                                  controls={false}
                                />
                              ) : isAudio ? (
                                <div className="flex flex-col items-center justify-center gap-1 text-amber-500">
                                  <span className="text-3xl">🎙️</span>
                                  <span className="text-[10px] font-mono font-bold">Audio Track</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                                  <FileText className="w-8 h-8" />
                                  <span className="text-[10px] font-mono font-bold">Document</span>
                                </div>
                              )}

                              {/* Category Badge Overlay */}
                              <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs text-amber-300 font-mono font-bold text-[9px] px-2 py-0.5 rounded-md border border-slate-700 uppercase">
                                {file.category || 'artwork'}
                              </div>

                              {/* Status Badge Overlay */}
                              <div className="absolute top-2 right-2 bg-emerald-950/80 backdrop-blur-xs text-emerald-300 font-mono font-bold text-[9px] px-2 py-0.5 rounded-md border border-emerald-700 uppercase">
                                {file.status || 'active'}
                              </div>
                            </div>

                            {/* File Name and Meta */}
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-display font-bold text-xs truncate max-w-[200px]" title={file.fileName}>
                                  {file.fileName}
                                </h5>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-orange-600 shrink-0">
                                  {formatBytes(file.fileSize)}
                                </span>
                              </div>
                              
                              <p className={`text-[10px] font-mono mt-0.5 ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>
                                📅 {new Date(file.uploadedAt || 0).toLocaleString()}
                              </p>
                            </div>

                            {/* Notes Display & Inline Editor */}
                            {editingFileNotesId === file.fileId ? (
                              <div className="space-y-1.5 pt-1">
                                <textarea
                                  value={editingFileNotesText}
                                  onChange={(e) => setEditingFileNotesText(e.target.value)}
                                  rows={2}
                                  placeholder="Add notes..."
                                  className={`w-full p-2 text-xs rounded-xl border focus:outline-none focus:border-amber-500 ${
                                    isNight ? 'bg-slate-955 border-slate-800 text-slate-100' : 'bg-white border-amber-200 text-amber-955'
                                  }`}
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingFileNotesId(null)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 text-slate-400 hover:text-slate-200"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveFileNotes(file.fileId)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-955 hover:bg-amber-600"
                                  >
                                    Save Note
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-0.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-orange-600">
                                  <span>Notes:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFileNotesId(file.fileId);
                                      setEditingFileNotesText(file.notes || '');
                                    }}
                                    className="text-[9px] underline hover:text-orange-700 cursor-pointer"
                                  >
                                    {file.notes ? 'Edit' : '+ Add Note'}
                                  </button>
                                </div>
                                <p className={`text-[11px] italic line-clamp-2 mt-0.5 ${
                                  isNight ? 'text-slate-300' : 'text-amber-900'
                                }`}>
                                  {file.notes ? `"${file.notes}"` : 'No notes attached.'}
                                </p>
                              </div>
                            )}

                            {/* AI Summaries / Tags if present */}
                            {file.aiSummaries && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="text-[9px] font-bold text-orange-600">AI Tags:</span>
                                {file.aiSummaries.split(',').map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-orange-600 border border-amber-500/30"
                                  >
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Actions Toolbar */}
                          <div className={`border-t pt-2.5 grid grid-cols-3 gap-1.5 ${
                            isNight ? 'border-slate-800' : 'border-amber-200'
                          }`}>
                            <button
                              type="button"
                              onClick={() => handleCopyFileUrl(file.fileId, file.fileUrl)}
                              className={`px-2 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                                copiedFileUrlId === file.fileId
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : (isNight
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-955 border-amber-200')
                              }`}
                              title="Copy direct file URL"
                            >
                              {copiedFileUrlId === file.fileId ? (
                                <>
                                  <Check className="w-3 h-3 text-white" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-orange-600" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            {/* Set as Cover Image */}
                            <button
                              type="button"
                              onClick={() => {
                                setCoverPhoto(file.fileUrl);
                                setViewMode('editor');
                                playChime('sparkle');
                              }}
                              className={`px-2 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                                isNight
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-955 border-amber-200'
                              }`}
                              title="Use this file as story cover"
                            >
                              <span>🎨 Set as Cover</span>
                            </button>

                            {/* Delete File */}
                            <button
                              type="button"
                              onClick={() => { setFileToDelete(file); playChime('pop'); }}
                              className="px-2 py-1.5 rounded-xl text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-300 dark:border-rose-800 transition cursor-pointer flex items-center justify-center gap-1"
                              title="Delete from Storage & Firestore"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* File Deletion Confirmation Modal */}
              {fileToDelete && (
                <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className={`max-w-md w-full p-6 rounded-3xl border-2 shadow-2xl space-y-4 animate-scale-up ${
                    isNight ? 'bg-slate-900 border-rose-800 text-slate-100' : 'bg-white border-rose-300 text-amber-955'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 flex items-center justify-center text-xl shrink-0">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="font-display font-extrabold text-sm text-rose-600">
                          {language === 'en' ? 'Confirm File Deletion' : 'Thibitisha Kufuta Faili'}
                        </h4>
                        <p className={`text-[11px] ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>
                          {fileToDelete.fileName}
                        </p>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                      isNight ? 'bg-slate-955 border-slate-800 text-slate-300' : 'bg-rose-50/50 border-rose-200 text-rose-955'
                    }`}>
                      <p>
                        {language === 'en'
                          ? "This action will permanently delete:"
                          : "Kitendo hiki kitafuta kabisa:"}
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] font-mono">
                        <li>Binary file from Firebase Storage bucket at <strong className="text-rose-500">/artist_upload/{effectiveUid}/{fileToDelete.fileName}</strong></li>
                        <li>Metadata document in Firestore at <strong className="text-rose-500">/users/{effectiveUid}/files/{fileToDelete.fileId}</strong></li>
                        <li>Clean up linked asset references in published picturebooks across <strong className="text-rose-500">/books</strong> & <strong className="text-rose-500">/picturebooks</strong></li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        disabled={isDeletingFile}
                        onClick={() => setFileToDelete(null)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isNight
                            ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-955'
                        }`}
                      >
                        {language === 'en' ? 'Cancel' : 'Ghairi'}
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingFile}
                        onClick={handleConfirmDeleteFile}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isDeletingFile ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{language === 'en' ? 'Deleting...' : 'Inafuta...'}</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Delete Permanently' : 'Futa Kabisa'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Tab 5: Artist Profile & Studio Settings */}
          {dashboardTab === 'profile' && (
            <div className="space-y-6 text-left animate-fade-in">
              
              {/* Success Notification Banner */}
              {profileSaveSuccess && (
                <div className="p-4 bg-emerald-950 border-2 border-emerald-500 rounded-2xl text-emerald-100 flex items-center gap-3 font-display font-bold text-xs shadow-sm animate-scale-up">
                  <span className="text-xl">✨</span>
                  <div>
                    <p>{language === 'en' ? 'Artist Profile & Studio Settings successfully saved!' : 'Wasifu na mipangilio ya studio imehifadhiwa kikamilifu!'}</p>
                    <p className="text-[10px] text-emerald-300 font-normal mt-0.5">Your credentials, bio, and studio configuration are fully updated.</p>
                  </div>
                </div>
              )}

              {/* Verified Identity Badge */}
              <div className={`p-6 rounded-3xl border-2 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isNight
                  ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100'
                  : 'bg-gradient-to-r from-amber-100/90 via-orange-50 to-amber-100/90 border-amber-200 text-amber-955'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500 text-slate-955 flex items-center justify-center text-3xl font-display shadow-inner border-2 border-amber-600 overflow-hidden">
                    {profilePicUrl ? (
                      <img src={profilePicUrl} alt={profileName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      profileAvatar || '🎨'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-display font-extrabold text-base ${isNight ? 'text-slate-100' : 'text-amber-955'}`}>{profileName}</h3>
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        {language === 'en' ? 'Verified Artist' : 'Msanii Aliyehakikiwa'}
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 font-bold font-mono mt-0.5">{profileUsername}</p>
                    <p className={`text-[11px] font-medium flex items-center gap-1.5 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                      <span>{isEmailRevealed ? profileEmail : maskEmail(profileEmail)}</span>
                      <button
                        type="button"
                        onClick={() => setIsEmailRevealed(!isEmailRevealed)}
                        className="text-[10px] text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                      >
                        {isEmailRevealed ? 'Hide' : 'Reveal'}
                      </button>
                    </p>
                  </div>
                </div>

                <div className={`px-3.5 py-2 rounded-2xl border text-right ${
                  isNight ? 'bg-slate-955 border-slate-800' : 'bg-white/80 border-amber-200'
                }`}>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-orange-600">Studio Security Status</p>
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3 text-emerald-600" /> Protected & Encrypted
                  </p>
                </div>
              </div>

              {/* Main Profile Form Grid */}
              <form onSubmit={handleSaveArtistProfile} className="space-y-6">
                
                {/* 1. Profile Information Card */}
                <div className={`rounded-3xl border-2 p-6 shadow-sm space-y-4 ${
                  isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white/95 border-amber-200 text-amber-955'
                }`}>
                  <h4 className={`font-display font-bold text-sm flex items-center gap-2 border-b pb-3 ${
                    isNight ? 'text-amber-200 border-slate-800' : 'text-amber-955 border-amber-200'
                  }`}>
                    <User className={`w-4 h-4 ${isNight ? 'text-amber-400' : 'text-orange-600'}`} />
                    {language === 'en' ? 'Artist Profile & Credentials' : 'Taarifa za Msanii'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        Full Name / Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-medium ${
                          isNight
                            ? 'bg-slate-955 border-slate-800 text-slate-100'
                            : 'bg-amber-50/50 border-amber-200 text-amber-955'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        Artist Handle / Username
                      </label>
                      <input
                        type="text"
                        required
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value)}
                        className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-mono font-medium ${
                          isNight
                            ? 'bg-slate-955 border-slate-800 text-slate-100'
                            : 'bg-amber-50/50 border-amber-200 text-amber-955'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`block text-[11px] font-display font-bold uppercase ${
                          isNight ? 'text-amber-200' : 'text-amber-955'
                        }`}>
                          Email Address
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsEmailRevealed(!isEmailRevealed)}
                          className="text-[10px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isEmailRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isEmailRevealed ? 'Mask Email' : 'Reveal Email'}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={isEmailRevealed ? "email" : "text"}
                          required
                          value={isEmailRevealed ? profileEmail : maskEmail(profileEmail)}
                          onChange={(e) => {
                            if (!isEmailRevealed) setIsEmailRevealed(true);
                            setProfileEmail(e.target.value);
                          }}
                          onFocus={() => {
                            // Reveal full email when user focuses to edit
                            setIsEmailRevealed(true);
                          }}
                          className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-medium pr-10 ${
                            isNight
                              ? 'bg-slate-955 border-slate-800 text-slate-100'
                              : 'bg-amber-50/50 border-amber-200 text-amber-955'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsEmailRevealed(!isEmailRevealed)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded cursor-pointer ${
                            isNight ? 'text-slate-400 hover:text-amber-400' : 'text-amber-800 hover:text-orange-600'
                          }`}
                          title="Toggle shoulder surfing protection"
                        >
                          {isEmailRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className={`text-[10px] mt-1 flex items-center gap-1 ${isNight ? 'text-slate-400' : 'text-amber-800'}`}>
                        <span>🛡️</span> Shoulder-surfing protection active (UI masked).
                      </p>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        Phone / WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+1 555-0192"
                        className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-medium ${
                          isNight
                            ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500'
                            : 'bg-amber-50/50 border-amber-200 text-amber-955 placeholder-amber-800/50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Profile Picture & Avatar */}
                  <div>
                    <label className={`block text-[11px] font-display font-bold uppercase mb-1.5 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Choose Avatar Buddy or Profile Picture URL
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['🎨', '👩‍🎨', '👨‍🎨', '🦊', '🦁', '🐼', '🦄', '🦉', '🔮', '🖌️'].map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => { setProfileAvatar(av); playChime('pop'); }}
                          className={`w-10 h-10 text-xl flex items-center justify-center rounded-xl border transition cursor-pointer ${
                            profileAvatar === av
                              ? 'bg-amber-500 border-amber-600 text-slate-955 scale-105 shadow-xs'
                              : (isNight ? 'bg-slate-955 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-955')
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                    <input
                      type="url"
                      value={profilePicUrl}
                      onChange={(e) => setProfilePicUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... (Optional profile photo URL)"
                      className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-medium ${
                        isNight
                          ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500'
                          : 'bg-amber-50/50 border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Artist Statement / Bio for Readers
                    </label>
                    <textarea
                      rows={3}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Describe your art forms, education background, or storytelling passion..."
                      className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-medium ${
                        isNight
                          ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500'
                          : 'bg-amber-50/50 border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>

                  {/* Art Categories & Specialization */}
                  <div>
                    <label className={`block text-[11px] font-display font-bold uppercase mb-1.5 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Primary Art Mediums & Specializations
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        'Sculpture & Clay',
                        'Watercolor & Painting',
                        'Origami & Papercraft',
                        'Storybook Illustration',
                        '3D Modeling & Crafts',
                        'Animation & Puppetry',
                        'Digital Art & Fine Art'
                      ].map((cat) => {
                        const isChecked = profileCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              playChime('pop');
                              const nextCats = isChecked
                                ? profileCategories.filter((c) => c !== cat)
                                : [...profileCategories, cat];
                              setProfileCategories(nextCats);

                              const standardCats = [
                                'Sculpture & Clay',
                                'Watercolor & Painting',
                                'Origami & Papercraft',
                                'Storybook Illustration',
                                '3D Modeling & Crafts',
                                'Animation & Puppetry',
                                'Digital Art & Fine Art'
                              ];
                              const currentTokens = profileSpecialization
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean);
                              const customTokens = currentTokens.filter(
                                (t) => !standardCats.some((c) => c.toLowerCase() === t.toLowerCase())
                              );
                              const formatted = customTokens.length > 0
                                ? [...nextCats, ...customTokens].join(', ')
                                : nextCats.join(', ');
                              setProfileSpecialization(formatted);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold border transition cursor-pointer ${
                              isChecked
                                ? 'bg-amber-500 text-slate-955 border-amber-600 shadow-xs'
                                : (isNight ? 'bg-slate-955 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-amber-50 text-amber-955 border-amber-200 hover:bg-amber-100')
                            }`}
                          >
                            {isChecked ? '✓ ' : '+ '}{cat}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={profileSpecialization}
                      onChange={(e) => setProfileSpecialization(e.target.value)}
                      placeholder="Custom Art Specialization / Niche (e.g. 3D Clay Modeling, Character Design)"
                      className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs font-medium mt-1 ${
                        isNight
                          ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500'
                          : 'bg-amber-50/50 border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-slate-955 font-display font-bold text-xs rounded-2xl shadow-md border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer transition flex items-center gap-2"
                  >
                    <span>✨</span> {language === 'en' ? 'Save Artist Profile & Settings' : 'Hifadhi Wasifu wa Msanii'}
                  </button>
                </div>
              </form>

              {/* 3. Dedicated Change Password Form */}
              <form onSubmit={handleChangeArtistPassword} className={`rounded-3xl border-2 p-6 shadow-sm space-y-4 ${
                isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white/95 border-amber-200 text-amber-955'
              }`}>
                <h4 className={`font-display font-bold text-sm flex items-center gap-2 border-b pb-3 ${
                  isNight ? 'text-amber-200 border-slate-800' : 'text-amber-955 border-amber-200'
                }`}>
                  <Lock className={`w-4 h-4 ${isNight ? 'text-amber-400' : 'text-orange-600'}`} />
                  {language === 'en' ? 'Change Artist Account Password' : 'Badilisha Nenosiri la Msanii'}
                </h4>

                {passwordStatusMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold font-display ${
                    passwordStatusMsg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {passwordStatusMsg.msg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs ${
                        isNight
                          ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500'
                          : 'bg-amber-50/50 border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Min 6 chars..."
                      className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs ${
                        isNight
                          ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500'
                          : 'bg-amber-50/50 border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-display font-bold uppercase mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter..."
                      className={`w-full px-4 py-2.5 border-2 focus:border-amber-500 focus:outline-none rounded-xl text-xs ${
                        isNight
                          ? 'bg-slate-955 border-slate-800 text-slate-100 placeholder-slate-500'
                          : 'bg-amber-50/50 border-amber-200 text-amber-955 placeholder-amber-800/50'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-955 font-display font-bold text-xs rounded-xl shadow transition active:scale-95 cursor-pointer border-b-2 border-amber-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{language === 'en' ? 'Save Profile Changes' : 'Hifadhi Mabadiliko ya Wasifu'}</span>
                  </button>
                </div>
              </form>

              {/* 4. Danger Zone: Delete Artist Account */}
              <div className={`rounded-3xl border-2 p-6 shadow-sm space-y-4 ${
                isNight
                  ? 'bg-rose-955/20 border-rose-900/60 text-rose-100'
                  : 'bg-rose-50/70 border-rose-200 text-rose-955'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-rose-200/50 dark:border-rose-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 font-bold shrink-0">
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-rose-600 dark:text-rose-400">
                        {language === 'en' ? 'Danger Zone: Delete Artist Account' : 'Eneo Hatari: Futa Akaunti ya Msanii'}
                      </h4>
                      <p className="text-[11px] opacity-90 text-rose-700 dark:text-rose-300">
                        {language === 'en'
                          ? 'Permanently delete your artist profile, cloud records, and login access.'
                          : 'Futa kabisa wasifu wako wa msanii, data ya cloud, na uwezo wa kuingia.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div className="text-xs space-y-1">
                    <p className={`font-semibold ${isNight ? 'text-rose-200' : 'text-rose-900'}`}>
                      {language === 'en'
                        ? 'Once deleted, your artist account cannot be recovered.'
                        : 'Akaunti ikishafutwa, haiwezi kurejeshwa tena.'}
                    </p>
                    <p className={`text-[11px] ${isNight ? 'text-slate-400' : 'text-stone-600'}`}>
                      {language === 'en'
                        ? 'This will erase your artist portfolio identity, verified status, and credentials from Firestore.'
                        : 'Hii itafuta vitambulisho vyako vya msanii na rekodi zako kutoka Firestore.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccountModal(true);
                      setDeleteConfirmationText('');
                      playChime('pop');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-display font-bold text-xs shadow-md border border-rose-700 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    id="delete-artist-account-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'en' ? 'Delete Account' : 'Futa Akaunti'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

        {/* 3. EDITOR FORM & WORKSPACE SCREEN */}
      {viewMode === 'editor' && (
        <div className="max-w-5xl mx-auto w-full">
          {/* Editor Header Navigation */}
          <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl border-2 shadow-xs ${
            isNight
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white/90 border-amber-200 text-amber-955'
          }`}>
            <button
              onClick={() => {
                setViewMode('portfolios');
                playChime('bubble');
              }}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl font-display font-bold text-xs transition cursor-pointer shadow-xs ${
                isNight
                  ? 'bg-slate-800 border border-slate-700 text-amber-200 hover:bg-slate-700 hover:text-amber-100'
                  : 'bg-amber-100/80 border border-amber-300 text-amber-955 hover:bg-amber-200/80'
              }`}
            >
              ⬅️ Back to Dashboard
            </button>
            <div className={`h-4 w-px ${isNight ? 'bg-slate-700' : 'bg-amber-300'}`} />
            <h2 className={`text-sm md:text-base font-display font-bold ${
              isNight ? 'text-amber-100' : 'text-amber-955'
            }`}>
              {editingBookId ? `✏️ Editing: "${title}"` : '🎨 Creating New Picture Book'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Design Book Metadata & Pages list (Span 5) */}
            <form onSubmit={handlePublish} className={`lg:col-span-5 p-5 rounded-3xl border-2 shadow-sm flex flex-col gap-4 ${
              isNight
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white/95 border-amber-200 text-amber-955'
            }`}>
              
              <div className="flex items-center justify-between">
                <h2 className={`font-display font-bold text-base flex items-center gap-1 select-none ${
                  isNight ? 'text-amber-100' : 'text-amber-955'
                }`}>
                  <BookOpen className={`w-5 h-5 ${isNight ? 'text-amber-400' : 'text-orange-600'}`} /> 1. Book Details
                </h2>
                <span className="text-[10px] uppercase font-display bg-amber-500 text-slate-955 px-2 py-0.5 rounded font-bold select-none">
                  {editingBookId ? 'Update Mode' : 'New Book'}
                </span>
              </div>

              {/* Inspiration Quick Loaders - Show only for new books */}
              {!editingBookId && (
                <div className={`p-3 rounded-2xl border ${
                  isNight ? 'bg-slate-955 border-slate-800' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <span className={`text-[11px] font-display font-bold block mb-1.5 select-none ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    ✨ Need Ideas? Select a kid friendly workspace template:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {INSPIRATION_TEMPLATES.map((tmpl, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => applyTemplate(tmpl)}
                        className={`p-1.5 rounded-xl text-left transition select-none cursor-pointer border ${
                          isNight
                            ? 'bg-slate-900 hover:bg-slate-800 hover:border-slate-700 border-slate-800'
                            : 'bg-white hover:bg-amber-100/60 border-amber-200'
                        }`}
                        id={`idea-template-${idx}`}
                      >
                        <p className={`font-display font-bold text-[10px] truncate ${
                          isNight ? 'text-amber-100' : 'text-amber-955'
                        }`}>{tmpl.title}</p>
                        <p className={`text-[8px] line-clamp-1 ${
                          isNight ? 'text-amber-300' : 'text-amber-800'
                        }`}>{tmpl.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title and Author Inputs */}
              <div className="space-y-3.5">
                <div>
                  <label className={`block text-xs font-display font-bold mb-1 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    Picture Book Title:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Wooden Puppy's Adventure"
                    required
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:border-amber-500 focus:outline-none ${
                      isNight
                        ? 'border-slate-800 bg-slate-955 text-slate-100 placeholder-slate-500'
                        : 'border-amber-200 bg-amber-50/50 text-amber-955 placeholder-amber-800/50'
                    }`}
                    id="creator-book-title"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-display font-bold mb-1 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    Artist Name (Author):
                  </label>
                  <input
                    type="text"
                    value={author}
                    disabled
                    required
                    className={`w-full px-3 py-2 text-xs rounded-xl border cursor-not-allowed outline-none select-none font-semibold ${
                      isNight
                        ? 'border-slate-800 bg-slate-955/50 text-slate-400'
                        : 'border-amber-200 bg-amber-100/50 text-amber-800/70'
                    }`}
                    id="creator-book-author"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-display font-bold mb-1 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    Short Description for kids:
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what interactive magic sits inside this art journey..."
                    rows={2}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:border-amber-500 focus:outline-none resize-none ${
                      isNight
                        ? 'border-slate-800 bg-slate-955 text-slate-100 placeholder-slate-500'
                        : 'border-amber-200 bg-amber-50/50 text-amber-955 placeholder-amber-800/50'
                    }`}
                    id="creator-book-desc"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Accent Color Theme:
                    </label>
                    <select
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className={`w-full px-2 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-amber-500 font-medium ${
                        isNight
                          ? 'border-slate-800 bg-slate-955 text-slate-100'
                          : 'border-amber-200 bg-amber-50/50 text-amber-955'
                      }`}
                      id="creator-book-accent"
                    >
                      <option value="orange">🔸 Playful Amber & Orange</option>
                      <option value="green">🌿 Forest Emerald & Sage</option>
                      <option value="blue">🌊 Ocean Azure & Cyan</option>
                      <option value="purple">🦄 Magic Purple & Amethyst</option>
                      <option value="rose">🌸 Sunset Rose & Berry</option>
                      <option value="yellow">☀️ Sunshine Gold & Yellow</option>
                      <option value="indigo">🌌 Midnight Indigo & Navy</option>
                      <option value="teal">💎 Crystal Teal & Jade</option>
                      <option value="terracotta">🏺 Terracotta Clay & Rust</option>
                      <option value="coral">🌺 Coral Bloom & Blossom</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Art Keywords (Comma separated):
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Clay, 3D, Watercolor"
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-amber-500 ${
                        isNight
                          ? 'border-slate-800 bg-slate-955 text-slate-100 placeholder-slate-500'
                          : 'border-amber-200 bg-amber-50/50 text-amber-955 placeholder-amber-800/50'
                      }`}
                      id="creator-book-tags"
                    />
                  </div>
                </div>

                {/* Cover photo selection & live featured inspection display */}
                <div className={`space-y-3 p-3.5 rounded-2xl border ${
                  isNight ? 'bg-slate-955 border-slate-800' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-display font-bold flex items-center gap-1.5 select-none ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      <span>🎨</span>
                      <span>{language === 'en' ? 'Select Book Cover Image:' : 'Chagua Picha ya Jalada:'}</span>
                    </label>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isNight ? 'bg-slate-900 text-amber-300 border-slate-800' : 'bg-white text-amber-955 border-amber-200'
                    }`}>
                      {getCoverSourceLabel(coverPhoto)}
                    </span>
                  </div>

                  {/* Featured Live Selected Cover Preview Box */}
                  {coverPhoto ? (
                    <div className={`p-2.5 rounded-2xl border-2 shadow-sm space-y-2 ${
                      isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-display font-bold flex items-center gap-1.5 ${
                          isNight ? 'text-amber-200' : 'text-amber-955'
                        }`}>
                          <span>✨</span>
                          <span>{language === 'en' ? 'Selected Cover Preview' : 'Onyesho la Jalada Lililochaguliwa'}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCoverPreviewZoomed(true);
                              playChime('sparkle');
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                              isNight
                                ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                            }`}
                            title="Inspect full resolution cover image"
                          >
                            <span>🔍</span>
                            <span>{language === 'en' ? 'Inspect Full View' : 'Kagua Picha Kamili'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCoverPhoto('');
                              playChime('pop');
                            }}
                            className="text-[10px] bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2 py-1 rounded-lg border border-rose-800 transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                            title="Remove selected cover image"
                          >
                            <span>🗑️</span>
                            <span>{language === 'en' ? 'Remove' : 'Ondoa'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Display Area */}
                      <div
                        onClick={() => {
                          setIsCoverPreviewZoomed(true);
                          playChime('sparkle');
                        }}
                        className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border shadow-inner group cursor-pointer transition transform hover:scale-[1.01] ${
                          isNight ? 'bg-slate-955 border-slate-800' : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <img
                          src={coverPhoto}
                          alt="Selected Cover Preview"
                          className="w-full h-full object-contain object-center group-hover:scale-105 transition duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {/* Hover Overlay Hint */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2">
                          <span className="bg-slate-900/90 text-amber-100 text-[11px] font-display font-bold px-3 py-1.5 rounded-xl border border-slate-700 shadow-md flex items-center gap-1.5">
                            <span>🔍</span>
                            <span>{language === 'en' ? 'Click to Inspect Full Resolution Cover' : 'Bofya Kukagua Picha Kamili'}</span>
                          </span>
                        </div>

                        {/* Active Badge Tag */}
                        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-md shadow-md flex items-center gap-1">
                          <span>✓</span>
                          <span>{language === 'en' ? 'Active Cover' : 'Jalada Ambalo Liko Amilifu'}</span>
                        </div>

                        {/* Live Book Title & Author Overlay Preview */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 text-white">
                          <p className="font-display font-bold text-xs truncate drop-shadow-sm text-amber-200">
                            📖 {title || (language === 'en' ? 'Untitled Picture Book' : 'Kitabu Kisicho na Jina')}
                          </p>
                          <p className="text-[10px] text-amber-100 font-medium truncate">
                            ✍️ {author || 'Artist'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-medium px-0.5 pt-0.5">
                        <span className="text-orange-600 font-bold">{getCoverSourceLabel(coverPhoto)}</span>
                        <span className={`text-[9px] ${isNight ? 'text-slate-400' : 'text-amber-800/70'}`}>
                          {language === 'en' ? 'Not what you wanted? Choose another preset or upload below 👇' : 'Sio unayotaka? Chagua nyingine hapa chini 👇'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-3.5 rounded-2xl border-2 border-dashed text-center space-y-1.5 ${
                      isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-amber-200 text-amber-955'
                    }`}>
                      <div className="text-2xl">🖼️</div>
                      <p className={`text-xs font-display font-bold ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                        {language === 'en' ? 'No Cover Image Selected Yet' : 'Bado Hakuna Picha ya Jalada Iliyochaguliwa'}
                      </p>
                      <p className={`text-[10px] ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                        {language === 'en' ? 'Select any art preset thumbnail below or upload your own picture file.' : 'Chagua mfano wa picha hapa chini au pakia faili yako.'}
                      </p>
                    </div>
                  )}

                  {/* Preset covers gallery toggle & picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-display font-bold ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? 'Preset Art Covers Gallery' : 'Maktaba ya Mifano ya Majalada'} ({presetCovers.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPresetGallery(!showPresetGallery)}
                        className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        {showPresetGallery ? (language === 'en' ? 'Hide Presets ▲' : 'Ficha ▲') : (language === 'en' ? 'Show Presets ▼' : 'Onyesha ▼')}
                      </button>
                    </div>

                    {showPresetGallery && (
                      <div className={`grid grid-cols-4 gap-1.5 mb-2 max-h-40 overflow-y-auto pr-1 p-1 rounded-xl border ${
                        isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-200'
                      }`}>
                        {presetCovers.map((preset) => {
                          const isSelected = coverPhoto === preset.url;
                          return (
                            <button
                              type="button"
                              key={preset.url}
                              onClick={() => {
                                setCoverPhoto(preset.url);
                                playChime('sparkle');
                              }}
                              className={`rounded-lg overflow-hidden border-2 transition relative group cursor-pointer active:scale-95 ${
                                isSelected ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-sm scale-[1.02]' : (isNight ? 'border-slate-800 hover:border-slate-700 opacity-90' : 'border-amber-200 hover:border-amber-300 opacity-90')
                              }`}
                            >
                              <img src={preset.url} alt={preset.label} className="w-full h-11 object-cover object-center group-hover:scale-105 transition" referrerPolicy="no-referrer" />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[8px] font-bold text-white uppercase leading-none select-none p-0.5 text-center">
                                {preset.label}
                              </span>
                              {isSelected && (
                                <div className="absolute top-0.5 right-0.5 bg-amber-500 text-slate-955 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-2xs">
                                  ✓
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Direct URL, Storage File Picker, and File Upload Option */}
                  <div className={`space-y-2 pt-1 border-t ${
                    isNight ? 'border-slate-800' : 'border-amber-200'
                  }`}>
                    {/* Select from personal storage assets if available */}
                    {userFiles.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold shrink-0 ${isNight ? 'text-amber-300' : 'text-orange-600'}`}>
                          📁 {language === 'en' ? 'From Cloud Storage:' : 'Kutoka Hifadhini:'}
                        </span>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setCoverPhoto(e.target.value);
                              playChime('sparkle');
                            }
                          }}
                          className={`flex-1 px-2.5 py-1 text-[10px] rounded-xl border font-semibold focus:outline-none focus:border-amber-500 ${
                            isNight ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-amber-200 text-amber-955'
                          }`}
                          defaultValue=""
                        >
                          <option value="" disabled>-- Select from your personal assets ({userFiles.length}) --</option>
                          {userFiles.map((uf) => (
                            <option key={uf.fileId} value={uf.fileUrl}>
                              {uf.category === 'cover' ? '📖 ' : '🎨 '}{uf.fileName} ({formatBytes(uf.fileSize)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={coverPhoto}
                        onChange={(e) => setCoverPhoto(e.target.value)}
                        placeholder={language === 'en' ? "Or paste image web URL..." : "Au weka linki ya picha mtandaoni..."}
                        className={`flex-1 px-3 py-1.5 text-[10px] rounded-xl border focus:outline-none focus:border-amber-500 ${
                          isNight
                            ? 'border-slate-800 text-slate-100 bg-slate-900 placeholder-slate-500'
                            : 'border-amber-200 text-amber-955 bg-white placeholder-amber-800/50'
                        }`}
                        id="creator-book-cover-custom"
                      />
                      <label className="bg-amber-500 hover:bg-amber-600 text-slate-955 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1 flex-shrink-0 active:scale-95">
                        <span>📁</span>
                        <span>{language === 'en' ? 'Upload & Save' : 'Pakia & Hifadhi'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Upload to personal Firebase Storage & Firestore metadata
                              uploadArtistFileToStorage(file, effectiveUid, {
                                fileName: file.name,
                                notes: `Book cover image for "${title || 'Untitled'}"`,
                                category: 'cover'
                              }).then((record) => {
                                if (record?.fileUrl) {
                                  setCoverPhoto(record.fileUrl);
                                }
                              }).catch((err) => console.warn("Cover storage upload fallback:", err));

                              // Immediate local compression fallback
                              compressImageFile(file, 800, 800, 0.82)
                                .then((compressedUrl) => {
                                  if (compressedUrl) {
                                    setCoverPhoto(compressedUrl);
                                    playChime('sparkle');
                                  }
                                })
                                .catch((err) => console.error("Cover image compression failed:", err));
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Pages Organizer list */}
              <div className={`border-t pt-3 ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-display font-bold select-none ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    Pages List ({pages.length})
                  </span>
                  <button
                    type="button"
                    onClick={addPage}
                    className="text-[10px] bg-amber-500 hover:bg-amber-600 text-slate-955 font-display font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition active:scale-95"
                    id="creator-add-page-button"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Page
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => { playChime('pop'); setActivePageIndex(idx); }}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition ${
                        activePageIndex === idx
                          ? 'bg-amber-500/20 border-amber-500 font-bold text-amber-955'
                          : (isNight
                              ? 'bg-slate-955 hover:bg-slate-900 border-slate-800 text-slate-300'
                              : 'bg-amber-50/50 hover:bg-amber-100/60 border-amber-200 text-amber-955')
                      }`}
                      id={`creator-page-nav-${idx}`}
                    >
                      <span className="truncate pr-2">
                        📄 Page {p.pageNumber}: {p.title || 'Untitled'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isNight ? 'bg-slate-900 text-amber-400 border-slate-800' : 'bg-amber-100 text-amber-955 border-amber-300'
                        }`}>
                          {p.artForm}
                        </span>
                        {pages.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removePage(idx); }}
                            className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                            title="Remove page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Can a child or parent download and save artist's image? */}
              <div className={`p-3.5 rounded-2xl border-2 text-left select-none ${
                isNight ? 'bg-slate-955 border-slate-800 text-slate-100' : 'bg-amber-50/80 border-amber-200 text-amber-955'
              }`}>
                <span className={`block text-xs font-display font-bold mb-1 flex items-center gap-1.5 ${
                  isNight ? 'text-amber-200' : 'text-amber-955'
                }`}>
                  💾 Download & Save Permission:
                </span>
                <p className={`text-[10px] leading-normal mb-2.5 ${
                  isNight ? 'text-slate-300' : 'text-amber-900'
                }`}>
                  {language === 'en' 
                    ? "Can a child or parent download and save your book's artwork/illustrations to their phone?" 
                    : "Je, mtoto au mzazi anaweza kupakua na kuhifadhi picha za kitabu chako kwenye simu zao?"}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setDownloadPermission('yes'); playChime('pop'); }}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all cursor-pointer ${
                      downloadPermission === 'yes'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs font-extrabold'
                        : (isNight ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-amber-200 text-amber-955 hover:bg-amber-100/60')
                    }`}
                  >
                    🟢 {language === 'en' ? 'Allowed' : 'Inaruhusiwa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDownloadPermission('no'); playChime('pop'); }}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all cursor-pointer ${
                      downloadPermission === 'no'
                        ? 'bg-rose-600 border-rose-500 text-white shadow-xs font-extrabold'
                        : (isNight ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-amber-200 text-amber-955 hover:bg-amber-100/60')
                    }`}
                  >
                    🔴 {language === 'en' ? 'Not Allowed' : 'Haiaruhusiwi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDownloadPermission('watermark'); playChime('pop'); }}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all cursor-pointer ${
                      downloadPermission === 'watermark'
                        ? 'bg-amber-500 border-amber-600 text-slate-955 shadow-xs font-extrabold'
                        : (isNight ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-amber-200 text-amber-955 hover:bg-amber-100/60')
                    }`}
                  >
                    🟡 {language === 'en' ? 'Watermark' : 'Nembo'}
                  </button>
                </div>
                <div className="mt-2 text-[9px] text-orange-600 font-medium">
                  {language === 'en'
                    ? "✨ Note: It is decided by each artist!"
                    : "✨ Kumbuka: Inaamuliwa na kila msanii!"}
                </div>
              </div>

              {formError && (
                <div className="bg-rose-950 text-rose-300 border-2 border-rose-800 p-3 rounded-2xl text-center text-xs font-semibold animate-shake select-none">
                  {formError}
                </div>
              )}

              {/* Removed Save as Draft and Publish buttons from Book Details as requested */}
            </form>

            {/* Right Column: Edit Page Details & Live Playground Mockup (Span 7) */}
            <div className={`lg:col-span-7 flex flex-col gap-4 ${
              isNight ? 'text-slate-100' : 'text-amber-955'
            }`}>
              
              {/* Active Page Editor Header */}
              <div className={`p-5 rounded-3xl border-2 shadow-sm flex flex-col gap-4 ${
                isNight ? 'bg-slate-900 border-slate-800' : 'bg-white/95 border-amber-200'
              }`}>
                
                <div className={`flex items-center justify-between border-b pb-2 ${
                  isNight ? 'border-slate-800' : 'border-amber-200'
                }`}>
                  <h2 className={`font-display font-bold text-sm flex items-center gap-1 select-none ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    <Layers className={`w-4 h-4 ${isNight ? 'text-amber-400' : 'text-orange-600'}`} /> Editing Page {activePageIndex + 1}: "{pages[activePageIndex]?.title || 'New Scene'}"
                  </h2>
                </div>

                {/* Multi-Artist Protection Lock Notice */}
                {pages[activePageIndex]?.artistName && activeArtistName && pages[activePageIndex].artistName !== activeArtistName && (
                  <div className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 text-xs select-none shadow-xs ${
                    isNight
                      ? 'bg-slate-955 border-amber-500/50 text-amber-100'
                      : 'bg-amber-50 border-amber-300 text-amber-955'
                  }`}>
                    <span className="text-2xl flex-shrink-0">🔒</span>
                    <div>
                      <strong className="font-display font-bold block text-orange-600 text-xs">
                        Page Created by Artist "{pages[activePageIndex].artistName}"
                      </strong>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${
                        isNight ? 'text-slate-300' : 'text-amber-900'
                      }`}>
                        This page was contributed by another artist. In PictureBook, artists cannot alter or delete work created by another contributor!
                      </span>
                    </div>
                  </div>
                )}

                {/* Inputs for current active page */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Page Subtitle / Scene Title <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      value={pages[activePageIndex]?.title || ''}
                      onChange={(e) => updateActivePage({ title: e.target.value })}
                      required
                      placeholder="e.g. Clay Castle in the Sky"
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:border-amber-500 focus:outline-none ${
                        isNight
                          ? 'border-slate-800 bg-slate-955 text-slate-100 placeholder-slate-500'
                          : 'border-amber-200 bg-amber-50/50 text-amber-955 placeholder-amber-800/50'
                      }`}
                      id="page-editor-title"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Art Form Medium:
                    </label>
                    <select
                      value={pages[activePageIndex]?.artForm || 'painting'}
                      onChange={(e) => {
                        const af = e.target.value as ArtFormType;
                        // Reset appropriate defaults
                        let defIntData = {};
                        if (af === 'sculpture') {
                          defIntData = { sculptureId: 'pot', sculptureMaterial: 'clay', colors: ['#ea580c', '#3b82f6', '#10b981'] };
                        } else if (af === 'craft') {
                          defIntData = { backgroundTheme: 'garden' };
                        } else if (af === 'painting') {
                          defIntData = { colors: ['#16a34a', '#eab308', '#2563eb', '#dc2626'] };
                        } else if (af === 'picture') {
                          defIntData = { hasFilterSwitcher: true };
                        } else {
                          defIntData = {
                            animatableElements: [
                              { id: 'custom1', label: 'Magic Balloon', emoji: '🎈', bounceType: 'jump', x: 50, y: 50 }
                            ]
                          };
                        }
                        updateActivePage({ artForm: af, interactiveData: defIntData });
                        playChime('pop');
                      }}
                      className={`w-full px-2 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-amber-500 font-semibold ${
                        isNight
                          ? 'border-slate-800 bg-slate-955 text-slate-100'
                          : 'border-amber-200 bg-amber-50/50 text-amber-955'
                      }`}
                      id="page-editor-artform"
                    >
                      <option value="sculpture">🗿 3D Sculpture / Pot</option>
                      <option value="craft">✂️ Origami & Craft Paper</option>
                      <option value="painting">🎨 Canvas Painting</option>
                      <option value="picture">📸 Picture Showcase</option>
                      <option value="animation">🎬 Kinetic Animation</option>
                    </select>
                  </div>
                </div>

                {/* Story Paragraph Narrative */}
                <div>
                  <label className={`block text-xs font-display font-bold mb-1 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    Chapter Story (Narrative text read aloud to children) <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    value={pages[activePageIndex]?.narrative || ''}
                    onChange={(e) => updateActivePage({ narrative: e.target.value })}
                    rows={3}
                    required
                    placeholder="Once upon a time, we mixed orange and blue clay to mold a friendly giant..."
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:border-amber-500 focus:outline-none font-sans ${
                      isNight
                        ? 'border-slate-800 bg-slate-955 text-slate-100 placeholder-slate-500'
                        : 'border-amber-200 bg-amber-50/50 text-amber-955 placeholder-amber-800/50'
                    }`}
                    id="page-editor-narrative"
                  />
                </div>

                {/* Educational Companion Tips Input */}
                <div>
                  <label className={`block text-xs font-display font-bold mb-1 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    Art Companion Tip (Educational insights on the medium) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={pages[activePageIndex]?.educationBuddyTip || ''}
                    onChange={(e) => updateActivePage({ educationBuddyTip: e.target.value })}
                    required
                    placeholder="Did you know? Sculpting helps you practice patterns and feel shapes with your hands!"
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:border-amber-500 focus:outline-none ${
                      isNight
                        ? 'border-slate-800 bg-slate-955 text-slate-100 placeholder-slate-500'
                        : 'border-amber-200 bg-amber-50/50 text-amber-955 placeholder-amber-800/50'
                    }`}
                    id="page-editor-buddytip"
                  />
                </div>

                {/* Custom Media Upload Section */}
                <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col gap-3 ${
                  isNight
                    ? 'border-slate-800 bg-slate-955 text-slate-100'
                    : 'border-amber-200 bg-amber-50/60 text-amber-955'
                }`}>
                  <div>
                    <label className={`block text-xs font-display font-bold flex items-center gap-1.5 select-none ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      <span>🎨</span>
                      <span>Upload Reference Artwork (Image or Video):</span>
                    </label>
                    <p className={`text-[10px] leading-snug select-none mt-0.5 ${
                      isNight ? 'text-slate-300' : 'text-amber-900'
                    }`}>
                      Fulfill your teaching vision! Drag & drop or upload a real photo, clay sculpture, painting, or demonstration video of your artwork. It will instantly appear on the student reading page.
                    </p>
                  </div>

                  {/* Hidden file input controlled by ref */}
                  <input
                    type="file"
                    ref={mediaFileInputRef}
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleMediaFile(file);
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="page-media-uploader"
                  />

                  {/* Drag & Drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleMediaFile(file);
                      }
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName !== 'BUTTON' && !target.closest('button') && target.tagName !== 'VIDEO') {
                        mediaFileInputRef.current?.click();
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[125px] relative group ${
                      isDraggingOver
                        ? 'border-amber-500 bg-amber-100/80 ring-4 ring-amber-500/30 scale-[1.01]'
                        : (isNight ? 'border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800/80' : 'border-amber-200 hover:border-amber-300 bg-white hover:bg-amber-50/80')
                    }`}
                  >
                    {pages[activePageIndex]?.mediaUrl ? (
                      <div className="w-full space-y-2.5">
                        {pages[activePageIndex]?.mediaType === 'video' ? (
                          <div className={`relative aspect-video max-h-48 mx-auto rounded-xl overflow-hidden flex items-center justify-center border shadow-sm ${
                            isNight ? 'bg-black border-slate-800' : 'bg-slate-900 border-amber-200'
                          }`}>
                            <video
                              src={pages[activePageIndex].mediaUrl}
                              className="w-full h-full max-h-48 object-contain"
                              controls
                              muted
                            />
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase select-none backdrop-blur-xs">
                              📹 Custom Video Reference
                            </div>
                          </div>
                        ) : (
                          <div className={`relative max-h-52 mx-auto rounded-xl overflow-hidden border-2 flex items-center justify-center p-1.5 shadow-sm group-hover:border-amber-500 transition ${
                            isNight ? 'bg-slate-955 border-slate-800' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <img
                              src={pages[activePageIndex].mediaUrl}
                              alt="Uploaded custom reference artwork"
                              className="w-full h-full max-h-48 object-contain rounded-lg"
                            />
                            <div className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase select-none backdrop-blur-xs shadow-xs border ${
                              isNight ? 'bg-slate-950/90 text-amber-200 border-slate-800' : 'bg-white/90 text-amber-955 border-amber-200'
                            }`}>
                              🖼️ Selected Picture Preview
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              mediaFileInputRef.current?.click();
                            }}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-955 font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                          >
                            <span>🔄</span>
                            <span>Choose Different Image / Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateActivePage({ mediaUrl: undefined, mediaType: undefined });
                              playChime('pop');
                            }}
                            className="text-xs text-rose-300 hover:text-rose-200 font-bold px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 transition cursor-pointer active:scale-95 flex items-center gap-1"
                          >
                            <span>🗑️</span>
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 select-none py-2 flex flex-col items-center">
                        <div className="text-4xl transition-transform group-hover:scale-110">
                          {isDraggingOver ? '📥' : '📤'}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                            {isDraggingOver ? 'Drop image file here now!' : 'Click anywhere here or Drag & Drop image file'}
                          </p>
                          <p className={`text-[10px] font-medium mt-0.5 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                            Select any picture from your computer (JPG, PNG, WEBP, GIF, SVG, MP4)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            mediaFileInputRef.current?.click();
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-955 font-display font-bold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 inline-flex items-center gap-1.5 mt-1"
                        >
                          <span>📁</span>
                          <span>Browse & Select Picture File from Device</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Select from personal storage assets if available */}
                  {userFiles.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[10px] font-bold shrink-0 ${isNight ? 'text-amber-300' : 'text-orange-600'}`}>
                        📁 {language === 'en' ? 'Select from Personal Storage:' : 'Chagua Kutoka Hifadhini:'}
                      </span>
                      <select
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          if (selectedVal) {
                            const isVid = selectedVal.match(/\.(mp4|webm|mov|ogg)$/i);
                            updateActivePage({
                              mediaUrl: selectedVal,
                              mediaType: isVid ? 'video' : 'image'
                            });
                            playChime('sparkle');
                          }
                        }}
                        className={`flex-1 px-3 py-1.5 text-xs rounded-xl border font-semibold focus:outline-none focus:border-amber-500 ${
                          isNight ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-amber-200 text-amber-955'
                        }`}
                        defaultValue=""
                      >
                        <option value="" disabled>-- Choose asset from your personal bucket ({userFiles.length}) --</option>
                        {userFiles.map((uf) => (
                          <option key={uf.fileId} value={uf.fileUrl}>
                            {uf.category === 'video' ? '🎬 ' : '🎨 '}{uf.fileName} ({formatBytes(uf.fileSize)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Direct Image/Video URL Input Option */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-[10px] font-bold select-none ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      Or paste direct image or video web URL:
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="url"
                        value={pages[activePageIndex]?.mediaUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          const isVid = val.match(/\.(mp4|webm|ogg)$/i);
                          updateActivePage({
                            mediaUrl: val || undefined,
                            mediaType: isVid ? 'video' : 'image'
                          });
                        }}
                        placeholder="https://images.unsplash.com/photo-... or https://..."
                        className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-amber-500 ${
                          isNight
                            ? 'border-slate-800 text-slate-100 bg-slate-900 placeholder-slate-500'
                            : 'border-amber-200 text-amber-955 bg-white placeholder-amber-800/50'
                        }`}
                        id="page-media-url-input"
                      />
                      {pages[activePageIndex]?.mediaUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            updateActivePage({ mediaUrl: undefined, mediaType: undefined });
                            playChime('pop');
                          }}
                          className="text-[10px] text-rose-300 hover:text-rose-200 font-bold px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 transition cursor-pointer flex-shrink-0"
                        >
                          🗑️ Clear Media
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Medium Config Specifier */}
                <div className={`p-3.5 rounded-2xl border ${
                  isNight ? 'bg-slate-955 border-slate-800' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <span className={`text-xs font-display font-bold block mb-2 select-none ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    ⚙️ Focus Art Settings:
                  </span>

                  {/* Sculpture options */}
                  {pages[activePageIndex]?.artForm === 'sculpture' && (
                    <div className="grid grid-cols-2 gap-3 text-xs font-display select-none">
                      <div>
                        <label className={`block font-semibold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>3D Mesh Base Model:</label>
                        <select
                          value={pages[activePageIndex]?.interactiveData?.sculptureId || 'pot'}
                          onChange={(e) => updateActivePageInteractive({ sculptureId: e.target.value as any })}
                          className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none font-medium ${
                            isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-amber-200 text-amber-955'
                          }`}
                          id="page-editor-sculpture-mesh"
                        >
                          <option value="pot">🏺 Ancient Clay Pot / Vase</option>
                          <option value="gem">💎 Sparkling Star Crystal</option>
                          <option value="dinosaur">🐶 Playdog Toy Figurine</option>
                          <option value="statue">🗿 African Ceremonial Mask</option>
                          <option value="giraffe">🦒 Savanna Giraffe Figurine</option>
                          <option value="pyramid">🔺 Golden Sun Pyramid</option>
                          <option value="shield">🛡️ Warrior Ceremonial Shield</option>
                          <option value="beetle">🪲 Scarab Jewel Beetle</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block font-semibold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>Standard Material:</label>
                        <select
                          value={pages[activePageIndex]?.interactiveData?.sculptureMaterial || 'clay'}
                          onChange={(e) => updateActivePageInteractive({ sculptureMaterial: e.target.value as any })}
                          className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none font-medium ${
                            isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-amber-200 text-amber-955'
                          }`}
                          id="page-editor-sculpture-mat"
                        >
                          <option value="clay">🎨 Terracotta Clay (Paintable Glaze!)</option>
                          <option value="marble">🏛️ White Carved Marble</option>
                          <option value="wood">🪵 Warm Polished Redwood</option>
                          <option value="bronze">🥉 Antique Golden Bronze</option>
                          <option value="gold">👑 Royal Shimmering Gold</option>
                          <option value="jade">❇️ Imperial Translucent Jade</option>
                          <option value="terracotta">🏺 Baked Rust Terracotta</option>
                          <option value="glass">💎 Crystal Frost Glass</option>
                          <option value="obsidian">🖤 Volcanic Obsidian Mirror</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Craft / Collage options */}
                  {pages[activePageIndex]?.artForm === 'craft' && (
                    <div className="text-xs font-display select-none">
                      <label className={`block font-semibold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>Stage Environment Theme Backdrop:</label>
                      <select
                        value={pages[activePageIndex]?.interactiveData?.backgroundTheme || 'garden'}
                        onChange={(e) => updateActivePageInteractive({ backgroundTheme: e.target.value as any })}
                        className={`px-2 py-1.5 border rounded-lg text-xs focus:outline-none ${
                          isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-amber-200 text-amber-955'
                        }`}
                        id="page-editor-craft-bg"
                      >
                        <option value="garden">🏡 Friendly Sunny Garden (Amber/Orange)</option>
                        <option value="forest">🌲 Deep Whispering Woods (Emerald/Amber)</option>
                        <option value="seabed">🌊 Coral Undersea Reef (Blue/Cyan)</option>
                        <option value="sky">☁️ Cloud Sanctuary (Sky Blue/Purple)</option>
                      </select>
                    </div>
                  )}

                  {/* Painting details */}
                  {pages[activePageIndex]?.artForm === 'painting' && (
                    <div className="text-xs font-display select-none">
                      <p className={`font-semibold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>Watercolor Palettes:</p>
                      <p className={`text-[11px] leading-normal ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                        This scene initializes your canvas board with an organic stencil mask (Deer or Tulip flower outlines) where kids brush and color. All paint brushes are prepared dynamically.
                      </p>
                    </div>
                  )}

                  {/* Photography filters details */}
                  {pages[activePageIndex]?.artForm === 'picture' && (
                    <div className="text-xs font-display select-none">
                      <p className={`font-semibold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>Camera Solar Lens Filters:</p>
                      <p className={`text-[11px] leading-normal ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                        Enables digital lens filters for study of light shadows, warmth contrast, and monochrome values. We pre-render standard photo guides of friendly gazelles!
                      </p>
                    </div>
                  )}

                  {/* Animation configuration */}
                  {pages[activePageIndex]?.artForm === 'animation' && (
                    <div className="text-xs font-display font-medium select-none">
                      <p className={`font-bold mb-1 ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>Kinetic Elements in the Puppet Screen:</p>
                      <p className={`text-[11px] leading-relaxed font-sans ${isNight ? 'text-amber-300' : 'text-amber-900'}`}>
                        Standard kinetic elements (Deer 🦌, Dragon 🐉, Sea Octopus 🐙, Tulip 🌷, Joyful Squirrel 🐿️) will be positioned on the stage depending on this book's overarching theme to let children bounce, sway, and tap them!
                      </p>
                    </div>
                  )}

                </div>

              </div>

              {/* Quick instructions widget & Bottom Action Bar */}
              <div className={`p-4 rounded-3xl border text-xs select-none ${
                isNight ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white/95 border-amber-200 text-amber-955'
              }`}>
                <span className={`font-display font-bold flex items-center gap-1 mb-1 ${
                  isNight ? 'text-amber-200' : 'text-amber-955'
                }`}>
                  <HelpCircle className={`w-4 h-4 ${isNight ? 'text-amber-400' : 'text-orange-600'}`} /> Checklist for Artists:
                </span>
                <ul className={`list-disc pl-5 font-sans space-y-1.5 leading-relaxed text-[11px] ${
                  isNight ? 'text-slate-300' : 'text-amber-900'
                }`}>
                  <li>Use <strong>child-friendly verbs</strong> (e.g. "creasing", "pinpointing", "sculpting") in your chapters to expand kid vocabulary.</li>
                  <li>Make sure to provide interesting <strong>ArtCompanion Tips</strong>. Clayton Blob reads them in high pitch to kids!</li>
                  <li>When ready, click "Save Changes" or "Publish" and check out the bookshelf. Your newly created book card will be ready to read with high-fidelity interactions!</li>
                </ul>
              </div>

              {/* Bottom Action Bar for Save Draft / Publish */}
              {formError && (
                <div className="bg-rose-955 text-rose-300 border-2 border-rose-800 p-3 rounded-2xl text-center text-xs font-semibold animate-shake select-none">
                  {formError}
                </div>
              )}
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 p-4 rounded-3xl border-2 shadow-xs ${
                isNight ? 'bg-slate-900 border-slate-800' : 'bg-white/95 border-amber-200'
              }`}>
                <button
                  type="button"
                  onClick={handleClearTemplate}
                  disabled={isSubmitting || isPublishing}
                  className={`py-3 px-3 font-display font-bold text-xs rounded-2xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isNight
                      ? 'bg-slate-955 hover:bg-slate-800 text-rose-300 border-rose-900/60 hover:border-rose-700'
                      : 'bg-rose-50/70 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300'
                  }`}
                  id="clear-template-workbench-bottom"
                >
                  🗑️ {language === 'en' ? 'Clear Template' : 'Futa Kiolezo'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBook('draft')}
                  disabled={isSubmitting || isPublishing}
                  className={`py-3 px-3 font-display font-bold text-xs rounded-2xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isNight
                      ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                  }`}
                  id="save-draft-workbench-bottom"
                >
                  {isSubmitting && submittingAction === 'draft' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>{language === 'en' ? 'Saving Draft...' : 'Inahifadhi Rasimu...'}</span>
                    </>
                  ) : (
                    <>
                      <span>📝</span>
                      <span>{language === 'en' ? 'Save as Draft' : 'Hifadhi kama Rasimu'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBook('published')}
                  disabled={isSubmitting || isPublishing}
                  className="py-3 px-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-955 font-display font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-b-3 border-b-amber-700"
                  id="publish-book-workbench-bottom"
                >
                  {isSubmitting && submittingAction === 'publish' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-955" />
                      <span>{language === 'en' ? 'Publishing...' : 'Inachapisha...'}</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>{language === 'en' ? 'Publish to Children' : 'Chapisha kwa Watoto'}</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* D. ARTIST SOCIAL MEDIA SHARING STUDIO MODAL */}
      {artistShareTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className={`rounded-3xl border-2 p-4 sm:p-5 md:p-6 w-[92vw] sm:w-[80vw] md:w-[50vw] max-w-lg max-h-[85vh] md:max-h-[70vh] flex flex-col overflow-y-auto shadow-2xl relative my-auto animate-scale-up ${
            isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-amber-50/95 border-amber-200 text-amber-955'
          }`}>
            
            {/* Close Modal Button */}
            <button
              onClick={() => { setArtistShareTarget(null); playChime('pop'); }}
              className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition border ${
                isNight ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700' : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
              }`}
              id="artist-share-modal-close"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className={`flex items-center gap-3 mb-4 border-b pb-4 ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-955 flex items-center justify-center shadow-md flex-shrink-0 font-bold">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-lg md:text-xl font-display font-bold leading-snug ${
                  isNight ? 'text-amber-100' : 'text-amber-955'
                }`}>
                  {artistShareTarget.type === 'portfolio'
                    ? (language === 'en' ? 'Share Artist Portfolio & Works' : 'Gawanya Portfolio ya Msanii')
                    : (language === 'en' ? `Share "${artistShareTarget.book?.title}"` : `Gawanya "${artistShareTarget.book?.title}"`)}
                </h3>
                <p className={`text-xs font-medium mt-0.5 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                  {language === 'en'
                    ? 'Promote your storybooks and artwork to parents, teachers, and kids on social media!'
                    : 'Tangaza vitabu na sanaa yako kwa wazazi, walimu, na watoto mtandaoni!'}
                </p>
              </div>
            </div>

            {/* Action Banner: Go to Dashboard Button */}
            {artistShareTarget.type === 'book' && artistShareTarget.book && (
              <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs mb-4 select-none ${
                isNight ? 'bg-slate-955 border-slate-800' : 'bg-white border-amber-200'
              }`}>
                <div className="text-left">
                  <span className={`font-display font-bold text-xs flex items-center gap-1 ${
                    isNight ? 'text-amber-200' : 'text-amber-955'
                  }`}>
                    🎉 {language === 'en' ? 'Storybook Published!' : 'Kitabu Kimechapishwa!'}
                  </span>
                  <p className={`text-[11px] font-medium mt-0.5 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                    {language === 'en'
                      ? 'Your storybook is live! Return to your dashboard to view your books collection.'
                      : 'Kitabu chako kiko hewani! Rudi kwenye dashibodi yako kuona vitabu vyako.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArtistShareTarget(null);
                    setViewMode('portfolios');
                    setDashboardTab('books');
                    playChime('sparkle');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-955 font-display font-bold text-xs rounded-xl shadow border-b-2 border-amber-700 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  id="dialogue-box-go-to-dashboard-btn"
                >
                  <Layers className="w-4 h-4" />
                  <span>{language === 'en' ? 'Go to Dashboard' : 'Nenda Kwenye Dashibodi'}</span>
                </button>
              </div>
            )}

            {/* If sharing a book, offer caption preset selector */}
            {artistShareTarget.type === 'book' && artistShareTarget.book && (
              <div className="mb-4">
                <label className={`block text-xs font-display font-bold mb-1.5 select-none ${
                  isNight ? 'text-amber-200' : 'text-amber-955'
                }`}>
                  {language === 'en' ? 'Select Announcement Style:' : 'Chagua Mtindo wa Tangazo:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSharePreset('release'); playChime('pop'); }}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                      sharePreset === 'release'
                        ? 'bg-amber-500 text-slate-955 border-amber-600 shadow-xs'
                        : (isNight ? 'bg-slate-955 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-amber-955 border-amber-200 hover:bg-amber-100/50')
                    }`}
                  >
                    🚀 {language === 'en' ? 'New Story Release' : 'Hadithi Mpya'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSharePreset('workshop'); playChime('pop'); }}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                      sharePreset === 'workshop'
                        ? 'bg-amber-500 text-slate-955 border-amber-600 shadow-xs'
                        : (isNight ? 'bg-slate-955 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-amber-955 border-amber-200 hover:bg-amber-100/50')
                    }`}
                  >
                    🎨 {language === 'en' ? 'Art Studio Guide' : 'Sanaa & Ufundi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSharePreset('educator'); playChime('pop'); }}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                      sharePreset === 'educator'
                        ? 'bg-amber-500 text-slate-955 border-amber-600 shadow-xs'
                        : (isNight ? 'bg-slate-955 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-amber-955 border-amber-200 hover:bg-amber-100/50')
                    }`}
                  >
                    📚 {language === 'en' ? 'For Parents & Kids' : 'Kwa Wazazi & Watoto'}
                  </button>
                </div>
              </div>
            )}

            {/* Formatted Share Text Box */}
            {(() => {
              const currentUrl = window.location.href;
              const targetBook = artistShareTarget.book;
              let captionText = '';

              if (artistShareTarget.type === 'portfolio') {
                captionText = language === 'en'
                  ? `🌟 Explore my digital storybook portfolio on PictureBook! Read my published picture books and art form guides: ${currentUrl}`
                  : `🌟 Tazama portfolio yangu ya vitabu vya picha kwenye PictureBook! Soma vitabu vyangu na miongozo ya sanaa: ${currentUrl}`;
              } else if (targetBook) {
                if (sharePreset === 'release') {
                  captionText = language === 'en'
                    ? `🎉 Exciting Announcement! I've published a new interactive picture book titled "${targetBook.title}" on PictureBook! Explore 3D sculptures, paper crafts, and stories for kids: ${currentUrl}`
                    : `🎉 Tangazo la Kufurahisha! Nimechapisha kitabu kipya cha picha kinachoitwa "${targetBook.title}" kwenye PictureBook! Tumbukia kwenye sanaa, vinyago na ufundi wa watoto: ${currentUrl}`;
                } else if (sharePreset === 'workshop') {
                  captionText = language === 'en'
                    ? `🎨 Step into my Art Studio & Creative Workshop! Check out "${targetBook.title}" featuring custom illustrations and hands-on art guides on PictureBook: ${currentUrl}`
                    : `🎨 Karibu kwenye Studio yangu ya Sanaa! Tazama "${targetBook.title}" iliyo na picha za kipekee na miongozo ya kubuni kwenye PictureBook: ${currentUrl}`;
                } else {
                  captionText = language === 'en'
                    ? `📚 Calling all parents, teachers, and young readers! Discover "${targetBook.title}", an art-integrated picture book designed to spark imagination on PictureBook: ${currentUrl}`
                    : `📚 Wito kwa wazazi, walimu, na wasomaji wadogo! Gundua "${targetBook.title}", kitabu cha picha kinachochochea ubunifu kwenye PictureBook: ${currentUrl}`;
                }
              }

              const encodedCaption = encodeURIComponent(captionText);
              const encodedUrl = encodeURIComponent(currentUrl);
              const coverImg = targetBook?.coverImage || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400';

              return (
                <div className="space-y-4">
                  
                  {/* Visual Social Card Preview */}
                  <div className={`p-3.5 border rounded-2xl flex items-center gap-3.5 shadow-xs ${
                    isNight ? 'bg-slate-955 border-slate-800' : 'bg-white border-amber-200'
                  }`}>
                    <img
                      src={coverImg}
                      alt="Cover"
                      className={`w-16 h-20 object-contain rounded-xl border flex-shrink-0 shadow-sm ${
                        isNight ? 'border-slate-800' : 'border-amber-200'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 overflow-hidden">
                      <span className={`text-[9px] font-bold uppercase tracking-wide ${
                        isNight ? 'text-amber-400' : 'text-orange-600'
                      }`}>
                        {artistShareTarget.type === 'portfolio' ? 'Artist Profile' : 'Digital Storybook'}
                      </span>
                      <h4 className={`font-display font-bold text-xs sm:text-sm truncate ${
                        isNight ? 'text-amber-100' : 'text-amber-955'
                      }`}>
                        {artistShareTarget.type === 'portfolio' ? (activeArtistName || 'Artist Portfolio') : targetBook?.title}
                      </h4>
                      <p className={`text-[10px] line-clamp-2 mt-0.5 leading-tight ${
                        isNight ? 'text-slate-300' : 'text-amber-900'
                      }`}>
                        {artistShareTarget.type === 'portfolio' ? 'Interactive picture books, clay modeling, watercolor painting, and origami craft guides!' : targetBook?.description}
                      </p>
                      <span className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full border mt-1.5 shadow-2xs ${
                        isNight ? 'bg-slate-900 text-amber-300 border-slate-800' : 'bg-amber-100 text-amber-955 border-amber-300'
                      }`}>
                        🎨 PictureBook Showcase
                      </span>
                    </div>
                  </div>

                  {/* Caption Editor & One-Click Copy */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-display font-bold select-none ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? 'Social Post Caption:' : 'Maelezo ya Chapisho:'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(captionText);
                          setCopiedCaption(true);
                          playChime('sparkle');
                          setTimeout(() => setCopiedCaption(false), 2500);
                        }}
                        className="text-[10px] font-display font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCaption ? (language === 'en' ? 'Caption Copied! ✨' : 'Imenakiliwa! ✨') : (language === 'en' ? 'Copy Caption' : 'Nakili Maelezo')}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={captionText}
                      rows={3}
                      className={`w-full p-2.5 text-xs rounded-xl border font-sans focus:outline-none resize-none leading-relaxed select-all ${
                        isNight ? 'border-slate-800 bg-slate-955 text-slate-100' : 'border-amber-200 bg-white text-amber-955'
                      }`}
                    />
                  </div>

                  {/* Social Media Direct Share Action Buttons Grid */}
                  <div>
                    <label className={`block text-xs font-display font-bold mb-2 select-none ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Post Directly to Platform:' : 'Chapisha Moja kwa Moja:'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      
                      {/* WhatsApp */}
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodedCaption}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playChime('sparkle')}
                        className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer text-decoration-none"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Twitter / X */}
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodedCaption}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playChime('sparkle')}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer text-decoration-none border border-slate-700"
                      >
                        <Send className="w-4 h-4" />
                        <span>Twitter / X</span>
                      </a>

                      {/* Facebook */}
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playChime('sparkle')}
                        className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer text-decoration-none"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Facebook</span>
                      </a>

                      {/* Pinterest */}
                      <a
                        href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(coverImg)}&description=${encodedCaption}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playChime('sparkle')}
                        className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer text-decoration-none"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Pinterest</span>
                      </a>

                      {/* LinkedIn */}
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playChime('sparkle')}
                        className="p-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-display font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer text-decoration-none"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>LinkedIn</span>
                      </a>

                      {/* Instagram / Threads Copy Button */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(captionText);
                          setCopiedCaption(true);
                          playChime('sparkle');
                          alert(language === 'en'
                            ? "Caption copied to clipboard! Open Instagram or Threads and paste into your story/post caption."
                            : "Maelezo yamenakiliwa! Fungua Instagram au Threads na ubandike kwenye chapisho lako."
                          );
                          setTimeout(() => setCopiedCaption(false), 2500);
                        }}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 hover:opacity-95 text-slate-955 font-display font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Instagram</span>
                      </button>

                    </div>
                  </div>

                  {/* Direct Link Bar */}
                  <div className={`pt-2 border-t flex items-center gap-2 ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className={`flex-1 p-2 text-[11px] rounded-xl border font-mono truncate ${
                        isNight ? 'border-slate-800 bg-slate-955 text-slate-100' : 'border-amber-200 bg-white text-amber-955'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentUrl);
                        setCopiedShareLink(true);
                        playChime('sparkle');
                        setTimeout(() => setCopiedShareLink(false), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-955 font-display font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer flex-shrink-0"
                    >
                      {copiedShareLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedShareLink ? (language === 'en' ? 'Copied!' : 'Imenakiliwa!') : (language === 'en' ? 'Copy Link' : 'Nakili Link')}
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Full Resolution Cover Artwork Inspection Lightbox Modal */}
      {isCoverPreviewZoomed && coverPhoto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className={`border-2 rounded-3xl p-4 sm:p-5 w-[92vw] sm:w-[80vw] md:w-[50vw] max-w-lg max-h-[85vh] md:max-h-[70vh] flex flex-col overflow-y-auto shadow-2xl relative space-y-3 sm:space-y-4 ${
            isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-amber-50/95 border-amber-200 text-amber-955'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b pb-3 ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <div>
                  <h3 className={`font-display font-bold text-sm ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                    {language === 'en' ? 'Book Cover Inspector' : 'Mchunguzi wa Picha ya Jalada'}
                  </h3>
                  <p className="text-[10px] text-amber-600 font-semibold">
                    {getCoverSourceLabel(coverPhoto)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCoverPreviewZoomed(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer border ${
                  isNight ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700' : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Full Preview Display */}
            <div className={`relative rounded-2xl overflow-hidden border max-h-[55vh] flex items-center justify-center p-2 ${
              isNight ? 'bg-slate-955 border-slate-800' : 'bg-white border-amber-200'
            }`}>
              <img
                src={coverPhoto}
                alt="Full Cover Inspection"
                className="max-h-[48vh] w-auto object-contain rounded-xl shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute bottom-2 left-2 right-2 backdrop-blur-md p-3 rounded-xl border ${
                isNight ? 'bg-slate-950/90 border-slate-800 text-slate-100' : 'bg-white/90 border-amber-200 text-amber-955'
              }`}>
                <p className={`font-display font-bold text-sm truncate ${isNight ? 'text-amber-200' : 'text-amber-955'}`}>
                  📖 {title || (language === 'en' ? 'Untitled Picture Book' : 'Kitabu Kisicho na Jina')}
                </p>
                <p className={`text-xs ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                  ✍️ {language === 'en' ? 'Artwork by' : 'Sanaa na'} {author || 'Artist'}
                </p>
              </div>
            </div>

            {/* Inspector Actions & Advice */}
            <div className="flex items-center justify-between pt-1 gap-3">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-lg font-bold">
                  ✓ Crisp Display
                </span>
                <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                  isNight ? 'bg-slate-800 border-slate-700 text-amber-200' : 'bg-amber-100 border-amber-300 text-amber-955'
                }`}>
                  ✓ Book Showcase Ready
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCoverPreviewZoomed(false);
                    setShowPresetGallery(true);
                  }}
                  className={`px-3 py-2 rounded-xl font-bold text-xs transition border cursor-pointer ${
                    isNight ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700' : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                  }`}
                >
                  🔄 {language === 'en' ? 'Pick Another' : 'Chagua Nyingine'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCoverPreviewZoomed(false);
                    playChime('sparkle');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-955 font-display font-bold text-xs shadow-md transition cursor-pointer"
                >
                  ✓ {language === 'en' ? 'Keep This Cover' : 'Tumia Jalada Hili'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Out Confirmation Dialogue Box Modal */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-fadeIn" id="logout-confirmation-modal">
          <div className={`border-2 rounded-3xl p-4 sm:p-5 w-[90vw] sm:w-[75vw] md:w-[45vw] max-w-sm max-h-[80vh] md:max-h-[60vh] flex flex-col shadow-2xl relative space-y-3 ${
            isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-amber-50/95 border-amber-200 text-amber-955'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-start justify-between border-b pb-3 ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-xl shadow-xs">
                  🚪
                </div>
                <div>
                  <h3 className={`font-display font-bold text-base ${isNight ? 'text-amber-100' : 'text-amber-955'}`}>
                    {language === 'en' ? 'Log Out of Creator Studio?' : 'Ondoka Kwenye Workbench?'}
                  </h3>
                  <p className={`text-xs font-medium ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                    {language === 'en' ? 'Confirm your decision to exit' : 'Thibitisha uamuzi wako wa kutoka'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  playChime('pop');
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer border ${
                  isNight ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700' : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                }`}
                title={language === 'en' ? 'Cancel' : 'Ghairi'}
                id="workbench-logout-close-icon"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Info */}
            <div className={`space-y-3 p-3.5 rounded-2xl border ${
              isNight ? 'bg-slate-955 border-slate-800' : 'bg-white border-amber-200'
            }`}>
              <div className={`text-xs leading-relaxed font-sans ${isNight ? 'text-slate-200' : 'text-amber-955'}`}>
                {language === 'en' ? (
                  <>
                    Are you sure you want to log out as <strong className="font-bold text-amber-600">{activeArtistName || 'Artist'}</strong>?
                    <br />
                    Logging out will exit Creator Studio and return to the <strong className="font-bold text-amber-600">Student Dashboard (Guest Mode)</strong>.
                  </>
                ) : (
                  <>
                    Je, una uhakika unataka kutoka kama <strong className="font-bold text-amber-600">{activeArtistName || 'Msanii'}</strong>?
                    <br />
                    Kutoka kutakutoa Creator Studio na kurudi kwenye <strong className="font-bold text-amber-600">Dashibodi ya Mwanafunzi (Hali ya Mgeni)</strong>.
                  </>
                )}
              </div>

              <div className={`flex items-center gap-2 text-[11px] p-2.5 rounded-xl border font-medium shadow-2xs ${
                isNight ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <span>💡</span>
                <span>
                  {language === 'en'
                    ? 'If you click Cancel, you will stay on this page with all your work preserved.'
                    : 'Ukibofya Ghairi, utabaki kwenye ukurasa huu na kazi zako zitahifadhiwa.'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  playChime('pop');
                }}
                className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs transition border active:scale-95 cursor-pointer ${
                  isNight ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700' : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                }`}
                id="workbench-logout-cancel-btn"
              >
                {language === 'en' ? 'Cancel (Stay Here)' : 'Ghairi (Baki Hapa)'}
              </button>
              <button
                type="button"
                onClick={handlePerformLogout}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                id="workbench-logout-confirm-btn"
              >
                <span>🚪</span>
                <span>{language === 'en' ? 'Confirm Log Out' : 'Thibitisha Kutoka'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Picture Book Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[110] p-4 select-none animate-fadeIn">
          <div className={`rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-2 space-y-4 ${
            isNight ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-amber-50/95 border-amber-200 text-amber-955'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-sm ${isNight ? 'text-amber-100' : 'text-amber-955'}`}>
                    {language === 'en' ? 'Delete Picture Book?' : 'Futa Kitabu Hiki?'}
                  </h3>
                  <p className="text-[11px] text-rose-600 font-semibold">
                    {language === 'en' ? 'This action cannot be undone.' : 'Kitendo hiki hakiwezi kubatilishwa.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBookToDelete(null);
                  playChime('pop');
                }}
                className={`text-lg font-bold p-1 rounded-lg transition cursor-pointer ${
                  isNight ? 'text-slate-400 hover:text-slate-200' : 'text-amber-800 hover:text-amber-955'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Book details card preview */}
            <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
              isNight ? 'bg-slate-955 border-slate-800' : 'bg-white border-amber-200'
            }`}>
              <div className={`w-12 h-14 rounded-xl overflow-hidden flex-shrink-0 border ${
                isNight ? 'bg-slate-900 border-slate-800' : 'bg-amber-100 border-amber-200'
              }`}>
                <img
                  src={bookToDelete.coverImage}
                  alt={bookToDelete.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-display font-bold text-xs truncate ${isNight ? 'text-amber-100' : 'text-amber-955'}`}>
                  {bookToDelete.title}
                </h4>
                <p className={`text-[11px] line-clamp-1 mt-0.5 ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
                  {bookToDelete.description}
                </p>
                <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded border ${
                  isNight ? 'bg-slate-900 text-rose-300 border-slate-800' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {bookToDelete.pages.length} {bookToDelete.pages.length === 1 ? 'Page' : 'Pages'}
                </span>
              </div>
            </div>

            {/* Warning Text */}
            <p className={`text-xs leading-relaxed ${isNight ? 'text-slate-300' : 'text-amber-900'}`}>
              {language === 'en'
                ? `Are you sure you want to permanently delete "${bookToDelete.title}"? It will be removed from your Creator Studio dashboard and library shelf.`
                : `Je, una uhakika unataka kufuta kabisa kitabu cha "${bookToDelete.title}"? Kitaondolewa kwenye studio yako na maktaba.`}
            </p>

            {/* Action Buttons: Confirm & Cancel */}
            <div className={`flex items-center justify-end gap-2.5 pt-2 border-t ${isNight ? 'border-slate-800' : 'border-amber-200'}`}>
              <button
                type="button"
                onClick={() => {
                  setBookToDelete(null);
                  playChime('pop');
                }}
                className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs transition border active:scale-95 cursor-pointer ${
                  isNight ? 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700' : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                }`}
                id="delete-book-cancel-btn"
              >
                {language === 'en' ? 'Cancel' : 'Ghairi'}
              </button>
              <button
                type="button"
                disabled={isDeletingBook}
                onClick={async () => {
                  setIsDeletingBook(true);
                  try {
                    await onDeleteBook(bookToDelete.id);
                    playChime('sparkle');
                  } catch (err) {
                    console.error('Failed to delete book:', err);
                  } finally {
                    setIsDeletingBook(false);
                    setBookToDelete(null);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-display font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                id="delete-book-confirm-btn"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeletingBook
                    ? (language === 'en' ? 'Deleting...' : 'Inafuta...')
                    : (language === 'en' ? 'Confirm Delete' : 'Thibitisha Kufuta')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ARTIST ACCOUNT CONFIRMATION MODAL */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[120] p-4 select-none animate-fadeIn">
          <div className={`rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 space-y-5 ${
            isNight ? 'bg-slate-900 border-rose-900 text-slate-100' : 'bg-white border-rose-300 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-rose-200 dark:border-rose-900/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-955/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 font-bold shrink-0 shadow-inner">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-rose-600 dark:text-rose-400">
                    {language === 'en' ? 'Permanently Delete Artist Account?' : 'Futa Kabisa Akaunti ya Msanii?'}
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-0.5">
                    {language === 'en' ? 'This action is irreversible and permanent.' : 'Kitendo hiki hakiwezi kubatilishwa.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingAccount) {
                    setShowDeleteAccountModal(false);
                    playChime('pop');
                  }
                }}
                className={`text-lg font-bold p-1 rounded-lg transition cursor-pointer ${
                  isNight ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Target Account Summary */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isNight ? 'bg-slate-955 border-slate-800' : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {language === 'en' ? 'Account to Delete' : 'Akaunti Inayofutwa'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-955 dark:text-rose-300 dark:border-rose-800">
                  {language === 'en' ? 'Artist Account' : 'Akaunti ya Msanii'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-955 flex items-center justify-center text-xl font-bold">
                  {profileAvatar || '🎨'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-sm truncate">{profileName || activeArtistName}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{profileEmail || userAccount?.email}</p>
                </div>
              </div>
            </div>

            {/* Warning Checklist */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-rose-600 dark:text-rose-400">
                {language === 'en' ? 'By deleting this account, you will lose:' : 'Kwa kufuta akaunti hii, utapoteza:'}
              </p>
              <ul className={`space-y-1.5 list-disc pl-5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
                <li>{language === 'en' ? 'Your verified artist studio badge and publishing credentials' : 'Beji yako ya msanii aliyehakikiwa na haki za kuchapisha'}</li>
                <li>{language === 'en' ? 'Direct messages and student subscriber connections' : 'Ujumbe wa moja kwa moja na wafuasi/wanafunzi wako'}</li>
                <li>{language === 'en' ? 'Cloud authentication and stored profile data from Firestore' : 'Akaunti ya kuingia na wasifu wako kwenye Firestore'}</li>
              </ul>
            </div>

            {/* Optional Books deletion checkbox */}
            {myBooks.length > 0 && (
              <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                isNight ? 'bg-slate-955 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <input
                  type="checkbox"
                  checked={deleteAccountWithBooks}
                  onChange={(e) => setDeleteAccountWithBooks(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-rose-600 cursor-pointer"
                />
                <span className="text-xs font-medium">
                  {language === 'en'
                    ? `Also delete all ${myBooks.length} picture book(s) authored by me from the library shelf`
                    : `Futa pia vitabu vyote ${myBooks.length} nilivyotunga kutoka kwenye rafu ya maktaba`}
                </span>
              </label>
            )}

            {/* Type Confirmation */}
            <div>
              <label className="block text-xs font-bold mb-1.5">
                {language === 'en' ? (
                  <>Type <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold">DELETE</span> to confirm:</>
                ) : (
                  <>Andika <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold">FUTA</span> ili kuthibitisha:</>
                )}
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder={language === 'en' ? 'DELETE' : 'FUTA'}
                className={`w-full px-4 py-2.5 rounded-xl border-2 text-xs font-mono font-bold focus:outline-none ${
                  isNight
                    ? 'bg-slate-955 border-slate-800 text-slate-100 focus:border-rose-500'
                    : 'bg-rose-50/40 border-rose-200 text-slate-900 focus:border-rose-500'
                }`}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  playChime('pop');
                }}
                className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs transition border active:scale-95 cursor-pointer ${
                  isNight ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                id="cancel-delete-artist-account-btn"
              >
                {language === 'en' ? 'Cancel (Keep Account)' : 'Ghairi (Baki na Akaunti)'}
              </button>

              <button
                type="button"
                disabled={isDeletingAccount || (deleteConfirmationText.trim().toUpperCase() !== (language === 'en' ? 'DELETE' : 'FUTA') && deleteConfirmationText.trim().toUpperCase() !== 'DELETE')}
                onClick={handleDeleteArtistAccount}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                id="confirm-delete-artist-account-btn"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeletingAccount
                    ? (language === 'en' ? 'Deleting Account...' : 'Inafuta Akaunti...')
                    : (language === 'en' ? 'Permanently Delete Account' : 'Futa Akaunti Kabisa')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTIST ONBOARDING APPLICATION MODAL */}
      {showApplicationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className={`max-w-lg w-full max-h-[88vh] overflow-y-auto my-auto rounded-3xl border-4 p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up scrollbar-thin ${
            isNight ? 'bg-slate-900 border-amber-600 text-amber-100' : 'bg-white border-amber-400 text-amber-955'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-200/50">
              <div className="flex items-center gap-2.5">
                {isApprovedArtist ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : isPendingArtist ? (
                  <Clock className="w-5 h-5 text-amber-500" />
                ) : (
                  <FileCheck className="w-5 h-5 text-amber-500" />
                )}
                <h3 className="font-display font-bold text-lg">
                  {isApprovedArtist
                    ? (language === 'en' ? 'Artist Application - Approved' : 'Ombi la Usajili - Imeidhinishwa')
                    : isPendingArtist
                    ? (language === 'en' ? 'Artist Application - Pending Review' : 'Ombi la Usajili - Linasubiri Ukaguzi')
                    : (language === 'en' ? 'Artist Verification Application' : 'Ombi la Usajili na Ukaguzi wa Msanii')}
                </h3>
              </div>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isPendingArtist && (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="font-bold font-display text-amber-900 dark:text-amber-100">
                      {language === 'en' ? 'Application Submitted & Pending Admin Review' : 'Ombi Limewasilishwa & Linasubiri Ukaguzi wa Admin'}
                    </p>
                    <p className="text-[11px] font-normal opacity-90 mt-0.5">
                      {language === 'en'
                        ? 'Your application with sample artwork has been sent to the administrator for review and approval.'
                        : 'Ombi lako na sampuli ya kazi limetumwa kwa msimamizi kwa ajili ya ukaguzi na idhini.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isRejectedArtist && (
              <div className="space-y-3">
                <div className="p-3.5 bg-rose-500/15 border-2 border-rose-500/50 rounded-2xl text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <p className="font-bold font-display text-rose-900 dark:text-rose-100">
                      {language === 'en' ? 'Previous Application Declined' : 'Ombi Lililopita Limekataliwa'}
                    </p>
                    <p className="text-[11px] font-normal opacity-90 mt-0.5">
                      {language === 'en'
                        ? 'The administrator reviewed your application and requested revisions. Please update your artwork sample and re-submit your application below.'
                        : 'Msimamizi amekagua ombi lako na kuomba mabadiliko. Tafadhali sasisha sampuli ya kazi yako na utume ombi upya hapa chini.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isApprovedArtist && (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-500/15 border-2 border-emerald-500/50 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold font-display text-emerald-900 dark:text-emerald-100">
                      {language === 'en' ? 'Artist Account Verified & Approved!' : 'Akaunti ya Msanii Imeidhinishwa!'}
                    </p>
                    <p className="text-[11px] font-normal opacity-90 mt-0.5">
                      {language === 'en'
                        ? 'Congratulations! Your artist profile and artwork sample have been verified and approved by administrators.'
                        : 'Hongera! Akaunti yako ya msanii na sampuli za kazi zimeidhinishwa na msimamizi.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {appSuccessMsg ? (
              <div className="p-4 bg-emerald-500/20 border-2 border-emerald-500 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{appSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} className="space-y-4 text-left">
                {!isApplicationSubmitted && (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {language === 'en'
                      ? 'Submit your artist profile details and portfolio artwork sample. Administrators will review your application to grant full public publishing rights.'
                      : 'Wasilisha maelezo yako na picha ya sampuli ya kazi yako. Msimamizi atakagua ombi lako ili kukupa ruhusa ya kuchapisha.'}
                  </p>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    {language === 'en' ? 'Full Name' : 'Jina Buat'} {isApplicationSubmitted ? '' : '*'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isApplicationSubmitted}
                    value={appFullName}
                    onChange={(e) => setAppFullName(e.target.value)}
                    placeholder="e.g. Kibali Mtema"
                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-xs font-medium focus:border-amber-500 focus:outline-none ${
                      isApplicationSubmitted
                        ? (isNight ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed')
                        : (isNight ? 'bg-slate-955 border-slate-700 text-amber-100' : 'bg-amber-50/50 border-amber-200 text-amber-955')
                    }`}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    {language === 'en' ? 'Email Address' : 'Barua Pepe'} {isApplicationSubmitted ? '' : '*'}
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isApplicationSubmitted}
                    value={appEmail}
                    onChange={(e) => setAppEmail(e.target.value)}
                    placeholder="e.g. artist@picturebook.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-xs font-medium focus:border-amber-500 focus:outline-none ${
                      isApplicationSubmitted
                        ? (isNight ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed')
                        : (isNight ? 'bg-slate-955 border-slate-700 text-amber-100' : 'bg-amber-50/50 border-amber-200 text-amber-955')
                    }`}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    {language === 'en' ? 'Phone Number' : 'Nambari ya Simu'} {isApplicationSubmitted ? '' : '*'}
                  </label>
                  <input
                    type="tel"
                    required
                    disabled={isApplicationSubmitted}
                    value={appPhone}
                    onChange={(e) => setAppPhone(e.target.value)}
                    placeholder="e.g. +254 712 345 678"
                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-xs font-medium focus:border-amber-500 focus:outline-none ${
                      isApplicationSubmitted
                        ? (isNight ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed')
                        : (isNight ? 'bg-slate-955 border-slate-700 text-amber-100' : 'bg-amber-50/50 border-amber-200 text-amber-955')
                    }`}
                  />
                </div>

                {/* Sample Artwork File Upload or URL */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    {language === 'en' ? 'Sample Artwork (Image or Video)' : 'Sampuli ya Kazi (Picha au Video)'} {isApplicationSubmitted ? '' : '*'}
                  </label>

                  {!isApplicationSubmitted ? (
                    !appSampleImage ? (
                      /* Empty Upload Dropzone */
                      <div className="space-y-2">
                        <div
                          onClick={() => appFileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              processArtworkFile(file);
                            }
                          }}
                          className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition hover:border-amber-500 hover:bg-amber-500/5 ${
                            isNight ? 'border-slate-700 bg-slate-900/50' : 'border-amber-300 bg-amber-50/30'
                          }`}
                        >
                          <UploadCloud className="w-8 h-8 text-amber-500" />
                          <div>
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-100">
                              {language === 'en' ? 'Click or drag artwork image or video here' : 'Bofya au buruta picha au video hapa'}
                            </p>
                            <p className="text-[10px] text-stone-500 mt-0.5">
                              {language === 'en' ? 'Images (PNG, JPG, WEBP) & Videos (MP4, MOV, WEBM) supported' : 'Inakubali Picha (PNG, JPG, WEBP) na Video (MP4, MOV, WEBM)'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="mt-1 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Upload Image / Video' : 'Pakia Picha / Video'}</span>
                          </button>
                        </div>

                        <input
                          ref={appFileInputRef}
                          type="file"
                          accept="image/*,video/*,.mp4,.mov,.webm,.ogv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              processArtworkFile(file);
                            }
                          }}
                          className="hidden"
                        />

                        <div className="pt-1">
                          <p className="text-[10px] text-gray-500 text-center font-bold mb-1">OR PASTE DIRECT IMAGE/VIDEO URL</p>
                          <input
                            type="url"
                            value={appSampleImage}
                            onChange={(e) => {
                              setAppSampleImage(e.target.value);
                              if (e.target.value) {
                                setAppSampleFileName(isVideoMedia(e.target.value) ? 'URL_Video' : 'URL_Image');
                              }
                            }}
                            placeholder="https://images.unsplash.com/... or https://.../video.mp4"
                            className={`w-full px-3.5 py-2 rounded-xl border-2 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                              isNight ? 'bg-slate-955 border-slate-700 text-amber-100' : 'bg-amber-50/50 border-amber-200 text-amber-955'
                            }`}
                          />
                        </div>
                      </div>
                    ) : (
                      /* Selected File Preview State & Remove Button */
                      <div className="space-y-2">
                        <div className="h-52 w-full rounded-2xl overflow-hidden border-2 border-amber-400 relative bg-slate-955 flex items-center justify-center shadow-inner">
                          {isVideoMedia(appSampleImage, appSampleFileName) ? (
                            <video
                              src={appSampleImage}
                              controls
                              playsInline
                              className="w-full h-full object-contain bg-black"
                            >
                              {language === 'en' ? 'Your browser does not support video playback.' : 'Kivinjari chako hakiauni kucheza video.'}
                            </video>
                          ) : (
                            <img
                              src={appSampleImage}
                              alt="Sample Preview"
                              className="w-full h-full object-contain"
                              onError={() => {
                                alert(language === 'en' ? 'Failed to load media preview.' : 'Shida imetokea wakati wa kupakua sampuli.');
                                handleRemoveSampleImage();
                              }}
                            />
                          )}

                          {/* File Name Info Badge */}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none z-10">
                            <span className="bg-black/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg font-mono truncate max-w-[65%] shadow-xs flex items-center gap-1">
                              <FileCheck className="w-3 h-3 text-amber-400" />
                              <span>{appSampleFileName || 'Artwork_Sample'}</span>
                            </span>
                            <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-md font-bold shadow-xs">
                              Attached
                            </span>
                          </div>

                          {/* Delete / Remove Picture Button */}
                          <button
                            type="button"
                            onClick={handleRemoveSampleImage}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-red-700 transition flex items-center gap-1.5 cursor-pointer z-20"
                            title="Remove Media"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Remove' : 'Odoa'}</span>
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Submitted Artwork View */
                    appSampleImage ? (
                      <div className="h-48 w-full rounded-2xl overflow-hidden border-2 border-amber-300 relative bg-slate-955 flex items-center justify-center">
                        {isVideoMedia(appSampleImage, appSampleFileName) ? (
                          <video
                            src={appSampleImage}
                            controls
                            playsInline
                            className="w-full h-full object-contain bg-black"
                          />
                        ) : (
                          <img
                            src={appSampleImage}
                            alt="Submitted Artwork"
                            className="w-full h-full object-contain"
                          />
                        )}
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold shadow-xs z-10">
                          {isVideoMedia(appSampleImage, appSampleFileName) ? 'Submitted Video' : 'Submitted Artwork'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">{language === 'en' ? 'No artwork attached' : 'Hakuna sampuli iliyoambatishwa'}</p>
                    )
                  )}
                </div>

                <div className="pt-3 border-t flex items-center justify-end gap-2.5 border-amber-200/50">
                  <button
                    type="button"
                    onClick={() => setShowApplicationModal(false)}
                    className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer text-gray-700 dark:text-gray-200"
                  >
                    {isApplicationSubmitted ? (language === 'en' ? 'Close' : 'Funga') : (language === 'en' ? 'Cancel' : 'Ghairi')}
                  </button>

                  {!isApplicationSubmitted && (
                    <button
                      type="submit"
                      disabled={appSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-display font-bold text-xs shadow border-b-2 border-amber-700 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>
                        {appSubmitting
                          ? (language === 'en' ? 'Submitting...' : 'Inatuma...')
                          : isRejectedArtist
                          ? (language === 'en' ? 'Re-submit Application' : 'Tuma Ombi Tena')
                          : (language === 'en' ? 'Submit Application' : 'Tuma Ombi')}
                      </span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
