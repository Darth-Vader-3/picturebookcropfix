export type ArtFormType = 'picture' | 'painting' | 'sculpture' | 'craft' | 'animation';

export type UserRole = 'student' | 'artist' | 'admin';
export type UserStatus = 'pending' | 'unapplied' | 'pending_application' | 'approved' | 'rejected' | 'suspended';

export interface UserAccount {
  role: UserRole;
  status?: UserStatus;
  artistStatus?: UserStatus;
  sampleImageUrl?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  phone?: string;
  avatar: string;
  profilePicUrl?: string;
  categories?: string[];
  bio?: string;
  specialization?: string;
  artistApplicationSubmitted?: boolean;
  artistApplicationDate?: string;
  isLoggedIn: boolean;
  createdAt?: string;
  uid?: string;
}

export interface CraftPiece {
  id: string;
  type: 'fabric' | 'papercut' | 'collage' | 'clay' | 'button' | 'leaf';
  name: string;
  emoji: string;
  color: string;
  defaultSize?: number;
}

export interface PlacedCraftPiece {
  id: string;
  pieceId: string;
  x: number; // percentage of canvas width (0-100)
  y: number; // percentage of canvas height (0-100)
  scale: number;
  rotation: number; // degrees
}

export interface Sculpture3DPoint {
  x: number;
  y: number;
  z: number;
}

export interface Sculpture3DFace {
  indices: number[];
  color: string;
  opacity?: number;
}

export interface SculptureModel {
  name: string;
  vertices: Sculpture3DPoint[];
  faces: Sculpture3DFace[];
  defaultScale: number;
  description: string;
}

export interface PageInteractiveData {
  // Picture type options
  hasFilterSwitcher?: boolean;
  filters?: { id: string; name: string; class: string; description: string }[];
  hiddenObjects?: { id: string; name: string; x: number; y: number; found: boolean; hint: string }[];
  
  // Painting type options
  colors?: string[];
  textures?: { id: string; name: string; pattern: string; brushSize: number }[];
  paintingOutlineUrl?: string; // Standard outline drawing SVG path or mockup
  
  // Sculpture type options
  sculptureId?: 'pot' | 'dinosaur' | 'gem' | 'statue' | 'giraffe' | 'pyramid' | 'shield' | 'beetle' | string;
  sculptureMaterial?: 'clay' | 'marble' | 'bronze' | 'wood' | 'gold' | 'jade' | 'terracotta' | 'glass' | 'obsidian' | string;
  
  // Craft type options
  availablePieces?: CraftPiece[];
  backgroundTheme?: 'forest' | 'sky' | 'seabed' | 'garden';
  
  // Animation type options
  animatableElements?: { id: string; label: string; emoji: string; bounceType: string; x: number; y: number }[];
}

export interface BookPage {
  id: string;
  pageNumber: number;
  title: string;
  narrative: string;
  artForm: ArtFormType;
  educationBuddyTip: string;
  interactiveData: PageInteractiveData;
  imageUrl?: string; // Standard Firestore schema key for page illustration
  illustrationUrl?: string; // Alternative illustration key matching Firestore schemas
  mediaUrl?: string; // Fallback placeholder image URL or visual illustration SVG representation
  image?: string; // Legacy or alternative image property
  mediaType?: 'image' | 'video'; // Added to track uploaded media formats
  artistName?: string; // Artist who created/authored this specific page
  cloudStorageUrl?: string; // Cloud storage backup URL
  localDataUrl?: string; // High-reliability base64 data URL
}

export interface BookReview {
  id: string;
  bookId: string;
  reviewerName: string;
  reviewerRole: 'Student' | 'Parent' | 'Teacher' | 'Reader';
  rating: number; // 1 to 5 stars
  comment: string;
  date: string;
  createdAt?: string;
}

export interface DirectMessage {
  id: string;
  artistName: string;
  bookTitle?: string;
  senderName: string;
  senderRole?: string;
  senderEmail: string;
  senderUid?: string;
  message: string;
  messageText?: string;
  timestamp: string;
  sentAt?: any;
  createdAt?: string;
}

export interface PictureBook {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  author: string;
  userId?: string;
  authorId?: string;
  authorEmail?: string;
  contributors?: string[]; // Array of contributing artist names
  status?: 'published' | 'draft' | 'pending_review' | 'pending_approval' | 'flagged'; // Publication or moderation status
  tags: string[];
  categories?: string[];
  language?: string;
  accentColor: string; // Tailwind color e.g. 'orange', 'green', 'blue'
  artForms: ArtFormType[];
  pages: BookPage[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  downloadPermission?: 'yes' | 'no' | 'watermark';
  readingTimeMinutes?: number;
  reviews?: BookReview[];
}

export interface ReportItem {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  reporterName: string;
  reporterRole: string; // 'Parent' | 'Teacher' | 'Guardian' | 'Reader'
  reporterEmail: string;
  reason: string;
  details: string;
  timestamp: string;
  autoScanFlagged?: boolean;
  autoScanReason?: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface Subscriber {
  id: string;
  studentName: string;
  avatar: string;
  favoriteArtForm: string;
  artistName: string;
  bookId?: string;
  bookTitle?: string;
  subscribedAt: string;
}

export interface UserFileMetadata {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  notes?: string;
  aiSummaries?: string;
  status: 'active' | 'archived' | 'deleted' | 'processing';
  storagePath?: string;
  contentType?: string;
  uid?: string;
  category?: 'artwork' | 'cover' | 'illustration' | 'sample' | 'audio' | 'video' | 'general';
}

export interface UserStamp {
  id: string; // e.g. `${bookId}_p${pageIndex}`
  bookId: string;
  bookTitle: string;
  pageIndex: number;
  pageNumber: number;
  pageTitle: string;
  author: string;
  artForm: string;
  stampTitle: string;
  stampIcon: string;
  stampedAt: string;
}

export interface UserBadge {
  id: string;
  badgeTitle: string;
  badgeIcon: string;
  description: string;
  category: 'page_stamp' | 'book_master' | 'medium_explorer' | 'collector';
  unlockedAt: string;
  bookId?: string;
  bookTitle?: string;
}
