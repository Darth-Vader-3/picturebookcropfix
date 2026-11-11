import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification, 
  sendPasswordResetEmail,
  applyActionCode,
  checkActionCode,
  signOut,
  deleteUser,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  getDocFromServer,
  deleteDoc, 
  query, 
  where,
  limit,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getBlob,
  listAll
} from 'firebase/storage';
import appletFirebaseConfig from '../firebase-applet-config.json';
import { safeSetItem, safeGetItem, safeGetJSON, safeParseJSON } from './utils/storage';
import { UserFileMetadata, PictureBook } from './types';

export const firebaseConfig = {
  apiKey: "AIzaSyA-xLjhHMSLMX0chdKwSQANNDn8JCuH-oI",
  authDomain: "picturebook-c32c1.firebaseapp.com",
  projectId: "picturebook-c32c1",
  storageBucket: "picturebook-c32c1.firebasestorage.app",
  messagingSenderId: "479461208960",
  appId: "1:479461208960:web:0cbcd5c3c7987bb0170765",
  measurementId: "G-DPYX4DKRZL",
  ...appletFirebaseConfig
};

if (!(import.meta as any)?.env?.VITE_FIREBASE_API_KEY && !firebaseConfig?.apiKey) {
  console.warn("Firebase credentials (VITE_FIREBASE_API_KEY) are undefined or missing.");
}

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics conditionally if supported in the client runtime
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {});
}
export const analytics = analyticsInstance;

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, "gs://picturebook-c32c1.firebasestorage.app");

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const sanitizeStorageFileName = (fileName: string): string => {
  if (!fileName || typeof fileName !== 'string') {
    return `file_${Date.now()}.png`;
  }
  // Strip dangerous path traversal, keep alphanumeric, dots, dashes, underscores
  const clean = fileName
    .replace(/^.*[\\\/]/, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_{2,}/g, '_');
  return clean || `file_${Date.now()}`;
};

export const getArtistStoragePath = (uid: string, fileName: string): string => {
  const cleanUid = (uid || 'guest').trim();
  const safeName = sanitizeStorageFileName(fileName);
  return `artist_upload/${cleanUid}/${safeName}`;
};

export const deleteStorageAssetIfFirebase = async (urlOrPath?: string): Promise<void> => {
  if (!urlOrPath || typeof urlOrPath !== 'string') return;
  const trimmed = urlOrPath.trim();
  if (
    trimmed.startsWith('gs://') ||
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('.appspot.com') ||
    trimmed.startsWith('artist_upload/') ||
    trimmed.startsWith('/artist_upload/')
  ) {
    try {
      const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
      const assetRef = storageRef(storage, cleanPath);
      await deleteObject(assetRef).catch((e) => {
        console.warn("Storage deleteObject notice:", e?.message || e);
      });
    } catch (err) {
      console.warn("Failed creating storageRef for asset deletion:", err);
    }
  }
};

/**
 * Upload an artist file directly to Firebase Storage at /artist_upload/${uid}/${fileName}
 * and sync metadata to Firestore at /users/${uid}/files/${fileId}
 */
export const uploadArtistFileToStorage = async (
  file: File | Blob,
  uid: string,
  options?: {
    fileName?: string;
    fileId?: string;
    notes?: string;
    aiSummaries?: string;
    category?: UserFileMetadata['category'];
    status?: UserFileMetadata['status'];
  }
): Promise<UserFileMetadata> => {
  const currentAuth = auth.currentUser;
  const effectiveUid = (uid || currentAuth?.uid || 'anonymous_user').trim();
  const rawFileName = options?.fileName || (file as File).name || `artwork_${Date.now()}.png`;
  const safeFileName = sanitizeStorageFileName(rawFileName);
  const fileId = options?.fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `artist_upload/${effectiveUid}/${safeFileName}`;

  const fileStorageRef = storageRef(storage, storagePath);
  const contentType = (file as any).type || (safeFileName.endsWith('.mp4') ? 'video/mp4' : 'image/png');

  // Upload binary file directly to user's personal storage folder
  const uploadResult = await withTimeout(
    uploadBytes(fileStorageRef, file, {
      contentType,
      customMetadata: {
        fileId,
        uid: effectiveUid,
        originalName: rawFileName,
        uploadedAt: new Date().toISOString()
      }
    }),
    15000
  );

  // Get download URL from Firebase Storage
  const fileUrl = await withTimeout(getDownloadURL(uploadResult.ref), 6000).catch(
    () => `https://firebasestorage.googleapis.com/v0/b/picturebook-c32c1.firebasestorage.app/o/${encodeURIComponent(storagePath)}?alt=media`
  );

  const fileMetadata: UserFileMetadata = {
    fileId,
    fileName: safeFileName,
    fileUrl,
    fileSize: file.size || 0,
    uploadedAt: new Date().toISOString(),
    notes: options?.notes || '',
    aiSummaries: options?.aiSummaries || '',
    status: options?.status || 'active',
    storagePath,
    contentType,
    uid: effectiveUid,
    category: options?.category || (contentType.startsWith('video/') ? 'video' : 'artwork')
  };

  // Sync metadata record in Firestore at /users/${uid}/files/${fileId}
  try {
    const firestoreFileRef = doc(db, 'users', effectiveUid, 'files', fileId);
    await withTimeout(setDoc(firestoreFileRef, fileMetadata, { merge: true }), 5000);
  } catch (err) {
    console.warn(`Firestore metadata sync notice for /users/${effectiveUid}/files/${fileId}:`, err);
  }

  // Update local storage cache for user
  try {
    const cacheKey = `digipicture_user_files_${effectiveUid}`;
    const cachedList = safeGetJSON<UserFileMetadata[]>(cacheKey, []);
    const updated = [fileMetadata, ...(Array.isArray(cachedList) ? cachedList.filter(f => f && f.fileId !== fileId) : [])];
    safeSetItem(cacheKey, updated);
  } catch (e) {
    console.warn("Local storage file cache update notice:", e);
  }

  return fileMetadata;
};

/**
 * Fetch all uploaded file records from Firestore at /users/${uid}/files
 */
export const fetchUserFilesFromFirestore = async (uid: string): Promise<UserFileMetadata[]> => {
  const effectiveUid = (uid || auth.currentUser?.uid || '').trim();
  if (!effectiveUid) return [];

  const cacheKey = `digipicture_user_files_${effectiveUid}`;
  let filesList: UserFileMetadata[] = [];

  try {
    const colRef = collection(db, 'users', effectiveUid, 'files');
    const snapshot = await withTimeout(getDocs(colRef), 4500);
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserFileMetadata;
      if (data && data.fileId) {
        filesList.push(data);
      }
    });

    filesList.sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
    safeSetItem(cacheKey, filesList);
    return filesList;
  } catch (err) {
    console.warn(`Firestore fetchUserFiles notice for /users/${effectiveUid}/files:`, err);
    const cached = safeGetJSON<UserFileMetadata[]>(cacheKey, []);
    return Array.isArray(cached) ? cached : [];
  }
};

/**
 * Real-time listener for user file metadata at /users/${uid}/files
 */
export const subscribeToUserFiles = (
  uid: string,
  onUpdate: (files: UserFileMetadata[]) => void
): Unsubscribe => {
  const effectiveUid = (uid || auth.currentUser?.uid || '').trim();
  if (!effectiveUid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const colRef = collection(db, 'users', effectiveUid, 'files');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const files: UserFileMetadata[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserFileMetadata;
          if (data && data.fileId) {
            files.push(data);
          }
        });
        files.sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
        safeSetItem(`digipicture_user_files_${effectiveUid}`, files);
        onUpdate(files);
      },
      (err) => {
        console.warn("User files onSnapshot notice:", err);
        const cached = safeGetJSON<UserFileMetadata[]>(`digipicture_user_files_${effectiveUid}`, []);
        onUpdate(Array.isArray(cached) ? cached : []);
      }
    );
  } catch (err) {
    console.warn("subscribeToUserFiles initialization notice:", err);
    return () => {};
  }
};

/**
 * Download a file from Storage path /artist_upload/${uid}/${fileName}
 */
export const downloadArtistFileFromStorage = async (
  uid: string,
  fileName: string,
  fileUrl?: string
): Promise<{ blob: Blob; url: string; fileName: string }> => {
  const effectiveUid = (uid || auth.currentUser?.uid || 'guest').trim();
  const safeName = sanitizeStorageFileName(fileName);
  const storagePath = `artist_upload/${effectiveUid}/${safeName}`;

  try {
    const fileRef = storageRef(storage, storagePath);
    const blob = await withTimeout(getBlob(fileRef), 10000);
    const blobUrl = URL.createObjectURL(blob);
    return { blob, url: blobUrl, fileName: safeName };
  } catch (storageErr) {
    console.warn("Direct Storage getBlob notice, trying URL fetch:", storageErr);
    if (fileUrl) {
      const resp = await fetch(fileUrl);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      return { blob, url: blobUrl, fileName: safeName };
    }
    throw storageErr;
  }
};

/**
 * Update metadata in Firestore at /users/${uid}/files/${fileId}
 */
export const updateUserFileMetadataInFirestore = async (
  uid: string,
  fileId: string,
  updates: Partial<UserFileMetadata>
): Promise<void> => {
  const effectiveUid = (uid || auth.currentUser?.uid || '').trim();
  if (!effectiveUid || !fileId) return;

  try {
    const docRef = doc(db, 'users', effectiveUid, 'files', fileId);
    await withTimeout(setDoc(docRef, updates, { merge: true }), 4000);

    const cacheKey = `digipicture_user_files_${effectiveUid}`;
    const cached = safeGetJSON<UserFileMetadata[]>(cacheKey, []);
    if (Array.isArray(cached)) {
      const updated = cached.map(f => f.fileId === fileId ? { ...f, ...updates } : f);
      safeSetItem(cacheKey, updated);
    }
  } catch (err) {
    console.warn(`Failed updating file metadata for ${fileId}:`, err);
  }
};

/**
 * Delete file from Firebase Storage at /artist_upload/${uid}/${fileName},
 * delete Firestore metadata record at /users/${uid}/files/${fileId},
 * and cleanup picturebooks linked to this file across both /books and /picturebooks collections.
 */
export const deleteArtistFileAndSync = async (
  uid: string,
  fileId: string,
  fileName?: string,
  fileUrl?: string
): Promise<{ success: boolean; affectedBooksCount: number }> => {
  const effectiveUid = (uid || auth.currentUser?.uid || '').trim();
  let affectedBooksCount = 0;

  // 1. Remove binary file from Firebase Storage at /artist_upload/${uid}/${fileName}
  if (fileName) {
    const safeName = sanitizeStorageFileName(fileName);
    const storagePath = `artist_upload/${effectiveUid}/${safeName}`;
    try {
      const fileRef = storageRef(storage, storagePath);
      await deleteObject(fileRef).catch((e) => {
        console.warn(`Storage deleteObject notice for ${storagePath}:`, e?.message || e);
      });
    } catch (err) {
      console.warn("Storage ref creation notice during deletion:", err);
    }
  }

  // Also remove if URL points to Firebase Storage
  if (fileUrl) {
    await deleteStorageAssetIfFirebase(fileUrl);
  }

  // 2. Delete Firestore metadata record at /users/${uid}/files/${fileId}
  if (effectiveUid && fileId) {
    try {
      const docRef = doc(db, 'users', effectiveUid, 'files', fileId);
      await withTimeout(deleteDoc(docRef), 3500).catch((e) => {
        console.warn(`Firestore delete doc notice for /users/${effectiveUid}/files/${fileId}:`, e);
      });
    } catch (err) {
      console.warn("Firestore file record deletion notice:", err);
    }
  }

  // 3. Clean up picturebooks linked to this file across both /books and /picturebooks collections
  const defaultFallbackCover = 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400';
  const collectionsToCheck = ['books', 'picturebooks'];

  for (const colName of collectionsToCheck) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await withTimeout(getDocs(colRef), 3500);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as PictureBook;
        let isModified = false;
        let updatedBook = { ...data };

        // Check cover image
        if (
          (fileUrl && updatedBook.coverImage === fileUrl) ||
          (fileName && updatedBook.coverImage && updatedBook.coverImage.includes(fileName))
        ) {
          updatedBook.coverImage = defaultFallbackCover;
          isModified = true;
        }

        // Check sample image
        if (
          (fileUrl && (updatedBook as any).sampleImageUrl === fileUrl) ||
          (fileName && (updatedBook as any).sampleImageUrl && (updatedBook as any).sampleImageUrl.includes(fileName))
        ) {
          (updatedBook as any).sampleImageUrl = '';
          isModified = true;
        }

        // Check pages
        if (Array.isArray(updatedBook.pages)) {
          const updatedPages = updatedBook.pages.map((page: any) => {
            let pageModified = false;
            let pCopy = { ...page };

            if (
              (fileUrl && pCopy.mediaUrl === fileUrl) ||
              (fileName && pCopy.mediaUrl && pCopy.mediaUrl.includes(fileName))
            ) {
              pCopy.mediaUrl = '';
              pageModified = true;
            }
            if (
              (fileUrl && pCopy.imageUrl === fileUrl) ||
              (fileName && pCopy.imageUrl && pCopy.imageUrl.includes(fileName))
            ) {
              pCopy.imageUrl = '';
              pageModified = true;
            }
            if (
              (fileUrl && pCopy.image === fileUrl) ||
              (fileName && pCopy.image && pCopy.image.includes(fileName))
            ) {
              pCopy.image = '';
              pageModified = true;
            }

            if (pageModified) isModified = true;
            return pCopy;
          });

          if (isModified) {
            updatedBook.pages = updatedPages;
          }
        }

        if (isModified) {
          affectedBooksCount++;
          await withTimeout(setDoc(doc(db, colName, docSnap.id), updatedBook, { merge: true }), 3500).catch((e) => {
            console.warn(`Firestore update notice for ${colName}/${docSnap.id}:`, e);
          });
        }
      }
    } catch (err) {
      console.warn(`Book cleanup error in ${colName}:`, err);
    }
  }

  // Update local books cache if affected
  try {
    const localBooks = safeGetJSON<PictureBook[]>('digipicture_custom_books', []);
    if (Array.isArray(localBooks)) {
      const updatedLocalBooks = localBooks.map((b: any) => {
        let mod = false;
        let copy = { ...b };
        if ((fileUrl && copy.coverImage === fileUrl) || (fileName && copy.coverImage?.includes(fileName))) {
          copy.coverImage = defaultFallbackCover;
          mod = true;
        }
        if (Array.isArray(copy.pages)) {
          copy.pages = copy.pages.map((p: any) => {
            if ((fileUrl && p.mediaUrl === fileUrl) || (fileName && p.mediaUrl?.includes(fileName))) {
              return { ...p, mediaUrl: '' };
            }
            return p;
          });
          mod = true;
        }
        return mod ? copy : b;
      });
      safeSetItem('digipicture_custom_books', updatedLocalBooks);
    }
  } catch (e) {
    console.warn("Local storage books cleanup notice:", e);
  }

  // Update local file cache for user
  if (effectiveUid) {
    try {
      const cacheKey = `digipicture_user_files_${effectiveUid}`;
      const cached = safeGetJSON<UserFileMetadata[]>(cacheKey, []);
      if (Array.isArray(cached)) {
        const filtered = cached.filter(f => f && f.fileId !== fileId && f.fileName !== fileName);
        safeSetItem(cacheKey, filtered);
      }
    } catch (e) {
      console.warn("Local storage user files cleanup notice:", e);
    }
  }

  return { success: true, affectedBooksCount };
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

const withTimeout = <T>(promise: Promise<T>, ms: number = 3500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore operation timed out after ${ms}ms`)), ms)
    )
  ]);
};

export interface FirestoreBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  category?: string;
  language?: string;
  pages?: any[];
  createdAt?: string;
  userId?: string;
  status?: string;
}

export interface ArtistProfile {
  uid: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
  specialization?: string;
  categories?: string[];
  avatar?: string;
  profilePicUrl?: string;
  role: 'artist' | 'student' | 'admin';
  status: 'unapplied' | 'pending' | 'pending_application' | 'approved' | 'rejected' | 'suspended';
  artistStatus?: 'unapplied' | 'pending' | 'pending_application' | 'approved' | 'rejected' | 'suspended';
  adminVerified?: boolean;
  verifiedAt?: string;
  sampleImageUrl?: string;
  artistApplicationSubmitted?: boolean;
  artistApplicationDate?: string;
  isEmailVerified: boolean;
  createdAt: any;
}

export const subscribeToBooks = (onUpdate: (books: any[]) => void): Unsubscribe => {
  const picturebooksRef = query(collection(db, 'picturebooks'), limit(20));
  return onSnapshot(picturebooksRef, (snapshot) => {
    let deletedIds = new Set<string>();
    try {
      const deletedList = safeGetJSON<string[]>('digipicture_deleted_book_ids', []);
      if (Array.isArray(deletedList)) {
        deletedIds = new Set(deletedList);
      }
    } catch (e) {
      console.error(e);
    }

    const booksMap = new Map<string, any>();
    snapshot.forEach((doc) => {
      if (!deletedIds.has(doc.id)) {
        booksMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    withTimeout(getDocs(query(collection(db, 'books'), limit(20))), 2500).then((booksSnap) => {
      booksSnap.forEach((doc) => {
        if (!deletedIds.has(doc.id) && !booksMap.has(doc.id)) {
          booksMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });
      const localBooks = safeGetJSON<any[]>('digipicture_custom_books', []);
      if (Array.isArray(localBooks)) {
        localBooks.forEach((lb: any) => {
          if (lb && lb.id && !deletedIds.has(lb.id) && !booksMap.has(lb.id)) {
            booksMap.set(lb.id, lb);
          }
        });
      }
      onUpdate(Array.from(booksMap.values()));
    }).catch(() => {
      onUpdate(Array.from(booksMap.values()));
    });
  }, (error) => {
    console.warn("Firestore onSnapshot error on picturebooks collection:", error);
  });
};

export const fetchBooks = async (): Promise<any[]> => {
  return fetchBooksFromFirestore(20);
};

export const fetchBooksFromFirestore = async (limitCount: number = 20): Promise<any[]> => {
  let deletedIds = new Set<string>();
  try {
    const deletedList = safeGetJSON<string[]>('digipicture_deleted_book_ids', []);
    if (Array.isArray(deletedList)) {
      deletedIds = new Set(deletedList);
    }
  } catch (e) {
    console.error(e);
  }

  const booksMap = new Map<string, any>();

  try {
    const pbRef = query(collection(db, 'picturebooks'), limit(limitCount));
    const booksRef = query(collection(db, 'books'), limit(limitCount));

    // Parallel fetch with .limit(20) to eliminate sequential delay
    const [pbSnap, booksSnap] = await Promise.all([
      withTimeout(getDocs(pbRef), 2500).catch(err => {
        console.warn("Direct picturebooks fetch notice:", err);
        return null;
      }),
      withTimeout(getDocs(booksRef), 2500).catch(err => {
        console.warn("Direct books fetch notice:", err);
        return null;
      })
    ]);

    if (pbSnap) {
      pbSnap.forEach((docSnap) => {
        if (!deletedIds.has(docSnap.id)) {
          booksMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        }
      });
    }

    if (booksSnap) {
      booksSnap.forEach((docSnap) => {
        if (!deletedIds.has(docSnap.id) && !booksMap.has(docSnap.id)) {
          booksMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        }
      });
    }
  } catch (err) {
    console.warn("Direct books parallel fetch notice:", err);
  }

  const localBooks = safeGetJSON<any[]>('digipicture_custom_books', []);
  if (Array.isArray(localBooks)) {
    localBooks.forEach((lb: any) => {
      if (lb && lb.id && !deletedIds.has(lb.id) && !booksMap.has(lb.id)) {
        booksMap.set(lb.id, lb);
      }
    });
  }

  return Array.from(booksMap.values());
};

export const saveBookToFirestore = async (bookData: any): Promise<any> => {
  const currentAuthUser = auth.currentUser;
  let activeStoredUser: any = null;
  try {
    activeStoredUser = safeGetJSON<any>('digipicture_user_account', null);
  } catch (e) {
    console.error(e);
  }

  const currentUid = currentAuthUser?.uid || activeStoredUser?.uid || bookData.userId || bookData.authorId || `user-${Date.now()}`;
  const currentEmail = currentAuthUser?.email || activeStoredUser?.email || bookData.authorEmail || '';
  const currentAuthorName = bookData.author || activeStoredUser?.name || currentAuthUser?.displayName || 'Artist';

  const bookId = bookData.id || `book-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const finalBook = {
    ...bookData,
    id: bookId,
    userId: bookData.userId || currentUid,
    authorId: bookData.authorId || currentUid,
    authorEmail: bookData.authorEmail || currentEmail,
    author: currentAuthorName,
    createdAt: bookData.createdAt || nowIso,
    updatedAt: bookData.updatedAt || nowIso
  };

  try {
    const pbRef = doc(db, 'picturebooks', bookId);
    await withTimeout(setDoc(pbRef, finalBook, { merge: true }), 3500);
  } catch (error) {
    console.warn("Firestore save picturebook notice:", error);
  }

  try {
    const bookRef = doc(db, 'books', bookId);
    await withTimeout(setDoc(bookRef, finalBook, { merge: true }), 3500);
  } catch (error) {
    console.warn("Firestore save book notice:", error);
  }

  try {
    const localBooks = safeGetJSON<any[]>('digipicture_custom_books', []);
    const validBooks = Array.isArray(localBooks) ? [...localBooks] : [];
    const index = validBooks.findIndex((b: any) => b && b.id === bookId);
    if (index !== -1) {
      validBooks[index] = finalBook;
    } else {
      validBooks.unshift(finalBook);
    }
    safeSetItem('digipicture_custom_books', validBooks);
  } catch (e) {
    console.error(e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('digipicture_books_updated', { detail: finalBook }));
  }

  return finalBook;
};

export const deleteBookFromFirestore = async (bookId: string, bookData?: any): Promise<void> => {
  if (!bookId) return;

  // Retrieve book data for storage assets if not passed
  let targetBook = bookData;
  if (!targetBook) {
    try {
      const localBooks = safeGetJSON<any[]>('digipicture_custom_books', []);
      if (Array.isArray(localBooks)) {
        targetBook = localBooks.find((b: any) => b && b.id === bookId);
      }
      if (!targetBook) {
        const pbSnap = await withTimeout(getDoc(doc(db, 'picturebooks', bookId)), 2500).catch(() => null);
        if (pbSnap && pbSnap.exists()) {
          targetBook = pbSnap.data();
        } else {
          const bookSnap = await withTimeout(getDoc(doc(db, 'books', bookId)), 2500).catch(() => null);
          if (bookSnap && bookSnap.exists()) {
            targetBook = bookSnap.data();
          }
        }
      }
    } catch (e) {
      console.warn("Book retrieval for storage cleanup notice:", e);
    }
  }

  // Delete associated storage image and media assets
  if (targetBook) {
    const assetsToDelete: string[] = [];
    if (targetBook.coverImage) assetsToDelete.push(targetBook.coverImage);
    if (targetBook.sampleImageUrl) assetsToDelete.push(targetBook.sampleImageUrl);
    if (Array.isArray(targetBook.pages)) {
      targetBook.pages.forEach((p: any) => {
        if (!p) return;
        if (p.mediaUrl) assetsToDelete.push(p.mediaUrl);
        if (p.imageUrl) assetsToDelete.push(p.imageUrl);
        if (p.image) assetsToDelete.push(p.image);
      });
    }
    for (const assetUrl of assetsToDelete) {
      await deleteStorageAssetIfFirebase(assetUrl);
    }
  }

  // Delete from picturebooks Firestore collection
  try {
    const pbRef = doc(db, 'picturebooks', bookId);
    await withTimeout(deleteDoc(pbRef), 3500);
  } catch (error) {
    console.warn("Firestore delete picturebook notice:", error);
  }

  // Delete from books Firestore collection
  try {
    const bookRef = doc(db, 'books', bookId);
    await withTimeout(deleteDoc(bookRef), 3500);
  } catch (error) {
    console.warn("Firestore delete book notice:", error);
  }

  try {
    const localBooks = safeGetJSON<any[]>('digipicture_custom_books', []);
    if (Array.isArray(localBooks)) {
      const remaining = localBooks.filter((b: any) => b && b.id !== bookId);
      safeSetItem('digipicture_custom_books', remaining);
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const deletedIds = safeGetJSON<string[]>('digipicture_deleted_book_ids', []);
    const validList = Array.isArray(deletedIds) ? [...deletedIds] : [];
    if (!validList.includes(bookId)) {
      validList.push(bookId);
      safeSetItem('digipicture_deleted_book_ids', validList);
    }
  } catch (e) {
    console.error(e);
  }
};

export const registerArtistWithFirebase = async (artistData: {
  email: string;
  password?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
  specialization?: string;
  categories?: string[];
  avatar?: string;
  profilePicUrl?: string;
  sampleImageUrl?: string;
  status?: 'unapplied' | 'pending' | 'pending_application' | 'approved' | 'rejected' | 'suspended';
  artistStatus?: 'unapplied' | 'pending' | 'pending_application' | 'approved' | 'rejected' | 'suspended';
  role?: 'artist' | 'student' | 'admin';
  adminVerified?: boolean;
  verifiedAt?: string;
  createdAt?: any;
}) => {
  const cleanEmail = artistData.email.trim().toLowerCase();
  let user: FirebaseUser | null = null;
  let uid = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  if (artistData.password && artistData.password.trim().length > 0) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, artistData.password);
      user = userCredential.user;
      uid = user.uid;

      // Send verification email with redirect to app with email autofilled
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}${window.location.pathname}?verify_email=${encodeURIComponent(cleanEmail)}`,
          handleCodeInApp: true
        };
        await sendEmailVerification(user, actionCodeSettings);
      } catch (verifErr) {
        console.warn("sendEmailVerification notice:", verifErr);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, artistData.password);
          user = userCredential.user;
          uid = user.uid;
          if (!user.emailVerified) {
            try {
              const actionCodeSettings = {
                url: `${window.location.origin}${window.location.pathname}?verify_email=${encodeURIComponent(cleanEmail)}`,
                handleCodeInApp: true
              };
              await sendEmailVerification(user, actionCodeSettings);
            } catch (vErr) {
              console.warn("Resend email verification notice:", vErr);
            }
          }
        } catch (signInErr) {
          console.warn("Sign in with existing email notice:", signInErr);
          throw err;
        }
      } else {
        console.warn("Firebase Auth create user notice:", err);
        throw err;
      }
    }
  }

  const firstName = artistData.firstName?.trim() || '';
  const lastName = artistData.lastName?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim() || artistData.name?.trim() || 'Artist';
  const username = artistData.username?.trim() || `@${cleanEmail.split('@')[0]}`;
  const phone = artistData.phone?.trim() || '';
  const bio = artistData.bio?.trim() || '';
  const specialization = artistData.specialization?.trim() || '';
  const categories = Array.isArray(artistData.categories) && artistData.categories.length > 0
    ? artistData.categories
    : ['Storybook Illustration'];

  // Firestore payload containing all required registration fields
  const artistProfileData = {
    name: `${firstName} ${lastName}`.trim() || fullName,
    firstName: firstName,
    lastName: lastName,
    username: username,
    email: cleanEmail,
    phone: phone,
    bio: bio,
    specialization: specialization,
    categories: categories,
    role: (artistData.role || 'artist') as any,
    status: artistData.status || (artistData.role === 'admin' ? 'approved' : 'unapplied'),
    artistStatus: artistData.artistStatus || artistData.status || (artistData.role === 'admin' ? 'approved' : 'unapplied'),
    adminVerified: artistData.adminVerified !== undefined ? artistData.adminVerified : (artistData.role === 'admin' ? true : false),
    avatar: artistData.avatar || '🎨',
    profilePicUrl: artistData.profilePicUrl || '',
    sampleImageUrl: artistData.sampleImageUrl || '',
    isEmailVerified: user?.emailVerified ?? false,
    createdAt: serverTimestamp()
  };

  // 1. Standardize Document Key: Save to /artists/{uid} using user's Auth uid as Document ID
  try {
    await setDoc(doc(db, "artists", uid), {
      uid: uid,
      ...artistProfileData
    }, { merge: true });
  } catch (err) {
    console.warn(`Firestore save to /artists/${uid} notice:`, err);
    try {
      handleFirestoreError(err, OperationType.WRITE, `artists/${uid}`);
    } catch (_) {}
  }

  // 2. Standardize Document Key: Save to /users/{uid} using the same user's Auth uid as Document ID
  try {
    await setDoc(doc(db, "users", uid), {
      uid: uid,
      ...artistProfileData
    }, { merge: true });
  } catch (err) {
    console.warn(`Firestore save to /users/${uid} notice:`, err);
    try {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    } catch (_) {}
  }

  // 3. Also maintain alias at /artists/{email} for backward compatibility if cleanEmail is valid
  if (cleanEmail.includes('@')) {
    try {
      await setDoc(doc(db, "artists", cleanEmail), {
        uid: uid,
        ...artistProfileData
      }, { merge: true });
    } catch (_) {}
  }

  // Sign user out after registration writes are stored
  if (user) {
    try {
      await signOut(auth);
    } catch (signOutErr) {
      console.warn("signOut after registration notice:", signOutErr);
    }
  }

  // Save to local cache with string timestamp
  try {
    const registeredList = safeGetJSON<any[]>('digipicture_registered_artists', []);
    const validList = Array.isArray(registeredList) ? registeredList.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail) : [];
    validList.push({
      ...artistProfileData,
      uid,
      createdAt: new Date().toISOString(),
      ...(artistData.password ? { password: artistData.password } : {})
    });
    safeSetItem('digipicture_registered_artists', validList);
  } catch (e) {
    console.error(e);
  }

  return { user, artistProfile: { ...artistProfileData, uid, createdAt: new Date().toISOString() } };
};

export const fetchArtistsFromFirestore = async (limitCount: number = 50): Promise<ArtistProfile[]> => {
  try {
    const deletedUsersList = safeGetJSON<string[]>('digipicture_deleted_users', []);
    const deletedSet = new Set((Array.isArray(deletedUsersList) ? deletedUsersList : []).map(s => (s || '').toLowerCase()));

    const artistsRef = query(collection(db, 'artists'), limit(limitCount));
    const snapshot = await withTimeout(getDocs(artistsRef), 2500);
    const artistsMap = new Map<string, ArtistProfile>();
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const emailKey = docSnap.id.toLowerCase();
      const emailVal = (data.email || emailKey).toLowerCase();
      const uidVal = (data.uid || docSnap.id).toLowerCase();
      
      if (deletedSet.has(emailKey) || deletedSet.has(emailVal) || deletedSet.has(uidVal)) {
        return;
      }

      artistsMap.set(emailKey, {
        uid: data.uid || docSnap.id,
        email: data.email || emailKey,
        name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Artist',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        username: data.username || emailKey.split('@')[0],
        phone: data.phone || '',
        bio: data.bio || '',
        specialization: data.specialization || '',
        categories: Array.isArray(data.categories) ? data.categories : ['Storybook Illustration'],
        avatar: data.avatar || '🎨',
        profilePicUrl: data.profilePicUrl || '',
        role: data.role || 'artist',
        status: data.status || 'pending',
        artistStatus: data.artistStatus || data.status || 'pending',
        adminVerified: data.adminVerified === true || data.role === 'admin' || data.status === 'approved' || data.artistStatus === 'approved',
        verifiedAt: data.verifiedAt || (data.status === 'approved' ? (data.createdAt || new Date().toISOString()) : ''),
        sampleImageUrl: data.sampleImageUrl || '',
        isEmailVerified: data.isEmailVerified ?? true,
        artistApplicationSubmitted: Boolean(data.artistApplicationSubmitted || data.sampleImageUrl || data.status === 'approved'),
        createdAt: data.createdAt || new Date().toISOString()
      });
    });

    try {
      const localList = safeGetJSON<any[]>('digipicture_registered_artists', []);
      if (Array.isArray(localList)) {
        localList.forEach((la: any) => {
          if (la && la.email) {
            const emailKey = la.email.toLowerCase();
            const uidKey = (la.uid || '').toLowerCase();
            if (deletedSet.has(emailKey) || (uidKey && deletedSet.has(uidKey))) {
              return;
            }
            if (!artistsMap.has(emailKey)) {
              artistsMap.set(emailKey, {
                uid: la.uid || `uid-${emailKey}`,
                email: la.email,
                name: la.name || `${la.firstName || ''} ${la.lastName || ''}`.trim() || 'Artist',
                firstName: la.firstName || '',
                lastName: la.lastName || '',
                username: la.username || emailKey.split('@')[0],
                phone: la.phone || '',
                bio: la.bio || '',
                specialization: la.specialization || '',
                categories: Array.isArray(la.categories) ? la.categories : ['Storybook Illustration'],
                avatar: la.avatar || '🎨',
                profilePicUrl: la.profilePicUrl || '',
                role: la.role || 'artist',
                status: la.status || 'pending',
                artistStatus: la.artistStatus || la.status || 'pending',
                adminVerified: la.adminVerified === true || la.role === 'admin' || la.status === 'approved' || la.artistStatus === 'approved',
                verifiedAt: la.verifiedAt || (la.status === 'approved' ? (la.createdAt || new Date().toISOString()) : ''),
                sampleImageUrl: la.sampleImageUrl || '',
                isEmailVerified: la.isEmailVerified ?? true,
                artistApplicationSubmitted: Boolean(la.artistApplicationSubmitted || la.sampleImageUrl || la.status === 'approved'),
                createdAt: la.createdAt || new Date().toISOString()
              });
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }

    return Array.from(artistsMap.values());
  } catch (err) {
    console.warn("Firestore fetch artists notice:", err);
    try {
      const deletedUsersList = safeGetJSON<string[]>('digipicture_deleted_users', []);
      const deletedSet = new Set((Array.isArray(deletedUsersList) ? deletedUsersList : []).map(s => (s || '').toLowerCase()));
      const saved = safeGetJSON<any[]>('digipicture_registered_artists', []);
      if (!Array.isArray(saved)) return [];
      return saved.filter((a: any) => a && a.email && !deletedSet.has(a.email.toLowerCase()));
    } catch {
      return [];
    }
  }
};

export const getUserAndArtistDoc = async (
  emailOrIdentifier: string,
  uid?: string
): Promise<{ userDoc: any; artistDoc: any; pendingDoc: any }> => {
  const cleanEmail = (emailOrIdentifier || '').trim().toLowerCase();
  const currentAuth = auth.currentUser;
  const isAuthSelf = currentAuth && (
    (cleanEmail && currentAuth.email?.toLowerCase() === cleanEmail) ||
    currentAuth.uid === emailOrIdentifier
  );
  const targetUid = uid || (isAuthSelf ? currentAuth.uid : (!cleanEmail.includes('@') ? cleanEmail : null));

  try {
    let userSnap: any = null;
    let artistSnap: any = null;

    // 1. Single Source of Truth: Prioritize direct lookup on /users/{uid} and /artists/{uid} using Auth uid
    if (targetUid) {
      const [uSnap, aSnap] = await Promise.all([
        withTimeout(getDoc(doc(db, 'users', targetUid)), 2500).catch(() => null),
        withTimeout(getDoc(doc(db, 'artists', targetUid)), 2500).catch(() => null)
      ]);
      userSnap = uSnap;
      artistSnap = aSnap;
    }

    // 2. Gracefully fall back to email querying only if uid lookup returns empty
    if ((!userSnap?.exists() || !artistSnap?.exists()) && cleanEmail.includes('@')) {
      const [uQuery, aQuery, aDirectSnap] = await Promise.all([
        !userSnap?.exists() ? withTimeout(getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1))), 2500).catch(() => null) : null,
        !artistSnap?.exists() ? withTimeout(getDocs(query(collection(db, 'artists'), where('email', '==', cleanEmail), limit(1))), 2500).catch(() => null) : null,
        !artistSnap?.exists() ? withTimeout(getDoc(doc(db, 'artists', cleanEmail)), 2500).catch(() => null) : null
      ]);

      if (!userSnap?.exists() && uQuery && !uQuery.empty) {
        userSnap = uQuery.docs[0];
      }
      if (!artistSnap?.exists()) {
        if (aQuery && !aQuery.empty) {
          artistSnap = aQuery.docs[0];
        } else if (aDirectSnap && aDirectSnap.exists()) {
          artistSnap = aDirectSnap;
        }
      }
    }

    // Check pending registrations if applicable
    let pendingSnap: any = null;
    if (cleanEmail.includes('@')) {
      pendingSnap = await withTimeout(getDoc(doc(db, 'pending_registrations', cleanEmail)), 2500).catch(() => null);
    }

    return {
      userDoc: userSnap && userSnap.exists() ? userSnap.data() : null,
      artistDoc: artistSnap && artistSnap.exists() ? artistSnap.data() : null,
      pendingDoc: pendingSnap && pendingSnap.exists() ? pendingSnap.data() : null
    };
  } catch (err) {
    console.warn("getUserAndArtistDoc parallel error:", err);
    return { userDoc: null, artistDoc: null, pendingDoc: null };
  }
};

/**
 * Fetch profile data directly from /users/{uid} or /artists/{uid} with email fallback.
 * Guarantees single source of truth across preview and production.
 */
export const fetchProfileFromFirestore = async (
  targetUid?: string | null,
  fallbackEmail?: string | null
): Promise<any | null> => {
  // 1. First priority: Direct lookup from /users/{uid} and /artists/{uid} using Auth uid
  if (targetUid) {
    try {
      const [uSnap, aSnap] = await Promise.all([
        withTimeout(getDoc(doc(db, 'users', targetUid)), 3000).catch(() => null),
        withTimeout(getDoc(doc(db, 'artists', targetUid)), 3000).catch(() => null)
      ]);
      const uData = uSnap && uSnap.exists() ? uSnap.data() : null;
      const aData = aSnap && aSnap.exists() ? aSnap.data() : null;

      if (uData || aData) {
        return {
          uid: targetUid,
          ...(uData || {}),
          ...(aData || {})
        };
      }
    } catch (err) {
      console.warn("fetchProfileFromFirestore UID lookup notice:", err);
    }
  }

  // 2. Fall back gracefully to email querying only if uid lookup returns empty
  const cleanEmail = (fallbackEmail || '').trim().toLowerCase();
  if (cleanEmail && cleanEmail.includes('@')) {
    try {
      const [uQuery, aQuery, aDirectSnap] = await Promise.all([
        withTimeout(getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1))), 3000).catch(() => null),
        withTimeout(getDocs(query(collection(db, 'artists'), where('email', '==', cleanEmail), limit(1))), 3000).catch(() => null),
        withTimeout(getDoc(doc(db, 'artists', cleanEmail)), 3000).catch(() => null)
      ]);

      const uData = uQuery && !uQuery.empty ? uQuery.docs[0].data() : null;
      const aData = aQuery && !aQuery.empty ? aQuery.docs[0].data() : (aDirectSnap && aDirectSnap.exists() ? aDirectSnap.data() : null);

      if (uData || aData) {
        const foundUid = uData?.uid || aData?.uid || (uQuery && !uQuery.empty ? uQuery.docs[0].id : null) || (aQuery && !aQuery.empty ? aQuery.docs[0].id : null);
        return {
          uid: foundUid,
          ...(uData || {}),
          ...(aData || {})
        };
      }
    } catch (err) {
      console.warn("fetchProfileFromFirestore email query notice:", err);
    }
  }

  return null;
};

/**
 * Sync Profile Writes: Writes updated bio, specialization, avatar, categories, and other profile
 * fields to the same document ID (Auth uid) across both /users and /artists collections simultaneously.
 */
export const syncProfileToFirestore = async (
  uid: string,
  profileUpdates: {
    name?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    bio?: string;
    specialization?: string;
    avatar?: string;
    profilePicUrl?: string;
    categories?: string[];
    phone?: string;
    email?: string;
    [key: string]: any;
  }
): Promise<boolean> => {
  if (!uid) return false;
  const cleanEmail = (profileUpdates.email || '').trim().toLowerCase();

  const payload = {
    ...profileUpdates,
    uid: uid,
    updatedAt: new Date().toISOString()
  };

  try {
    // Write simultaneously to /users/{uid} and /artists/{uid}
    const writes: Promise<any>[] = [
      withTimeout(setDoc(doc(db, 'users', uid), payload, { merge: true }), 4000),
      withTimeout(setDoc(doc(db, 'artists', uid), payload, { merge: true }), 4000)
    ];

    // Maintain alias at /artists/{cleanEmail} if valid email
    if (cleanEmail && cleanEmail.includes('@')) {
      writes.push(
        withTimeout(setDoc(doc(db, 'artists', cleanEmail), payload, { merge: true }), 4000).catch(() => {})
      );
    }

    await Promise.all(writes);

    // Synchronize local cache
    try {
      const activeAccount = safeGetJSON<any>('digipicture_user_account', null);
      if (activeAccount && (activeAccount.uid === uid || activeAccount.email?.toLowerCase() === cleanEmail)) {
        safeSetItem('digipicture_user_account', { ...activeAccount, ...payload });
      }

      const registered = safeGetJSON<any[]>('digipicture_registered_artists', []);
      if (Array.isArray(registered)) {
        const updated = registered.map((a: any) => {
          if (a && (a.uid === uid || (cleanEmail && a.email?.toLowerCase() === cleanEmail))) {
            return { ...a, ...payload };
          }
          return a;
        });
        safeSetItem('digipicture_registered_artists', updated);
      }
    } catch (e) {
      console.warn("syncProfileToFirestore cache sync notice:", e);
    }

    return true;
  } catch (err) {
    console.error("syncProfileToFirestore error:", err);
    return false;
  }
};

export const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  if (clean.includes('@') && clean.includes('.')) {
    return clean;
  }

  const rawUsername = clean.startsWith('@') ? clean.slice(1) : clean;
  const atUsername = `@${rawUsername}`;

  try {
    const localList = safeGetJSON<any[]>('digipicture_registered_artists', []);
    if (Array.isArray(localList)) {
      const match = localList.find((a: any) => {
        if (!a) return false;
        const u = (a.username || '').toLowerCase();
        const e = (a.email || '').toLowerCase();
        return u === rawUsername || u === atUsername || e.split('@')[0] === rawUsername;
      });
      if (match?.email) {
        return match.email.toLowerCase();
      }
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const [artistsSnap, usersSnap] = await Promise.all([
      withTimeout(getDocs(query(collection(db, 'artists'), limit(30))), 2500).catch(() => null),
      withTimeout(getDocs(query(collection(db, 'users'), limit(30))), 2500).catch(() => null)
    ]);

    if (artistsSnap) {
      for (const docSnap of artistsSnap.docs) {
        const data = docSnap.data();
        const u = (data.username || '').toLowerCase();
        const e = (data.email || docSnap.id).toLowerCase();
        if (u === rawUsername || u === atUsername || e.split('@')[0] === rawUsername) {
          return e;
        }
      }
    }

    if (usersSnap) {
      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        const u = (data.username || data.handle || '').toLowerCase();
        const e = (data.email || docSnap.id).toLowerCase();
        if (u === rawUsername || u === atUsername || e.split('@')[0] === rawUsername) {
          return e;
        }
      }
    }
  } catch (err) {
    console.warn("Firestore resolve identifier notice:", err);
  }

  return null;
};

export const updateArtistStatusInFirestore = async (
  email: string,
  status: 'unapplied' | 'pending' | 'pending_application' | 'approved' | 'rejected' | 'suspended',
  uid?: string
): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  const targetUid = uid || (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail ? auth.currentUser.uid : null);
  const isAdminVerified = status === 'approved';
  const statusPayload: any = { 
    status, 
    artistStatus: status,
    adminVerified: isAdminVerified,
    ...(isAdminVerified ? { verifiedAt: new Date().toISOString() } : {})
  };
  
  try {
    const writes: Promise<any>[] = [];
    if (targetUid) {
      writes.push(
        withTimeout(setDoc(doc(db, 'artists', targetUid), statusPayload, { merge: true }), 3500),
        withTimeout(setDoc(doc(db, 'users', targetUid), statusPayload, { merge: true }), 3500)
      );
    }
    if (cleanEmail.includes('@')) {
      writes.push(
        withTimeout(setDoc(doc(db, 'artists', cleanEmail), statusPayload, { merge: true }), 3500)
      );
    }
    await Promise.all(writes);
  } catch (e) {
    console.warn("Firestore status update notice:", e);
  }

  try {
    const list = safeGetJSON<any[]>('digipicture_registered_artists', []);
    if (Array.isArray(list)) {
      const updated = list.map((a: any) => {
        if (a && ((cleanEmail && a.email?.toLowerCase() === cleanEmail) || (targetUid && a.uid === targetUid))) {
          return { ...a, ...statusPayload };
        }
        return a;
      });
      safeSetItem('digipicture_registered_artists', updated);
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const activeAccount = safeGetJSON<any>('digipicture_user_account', null);
    if (activeAccount && ((cleanEmail && activeAccount.email?.toLowerCase() === cleanEmail) || (targetUid && activeAccount.uid === targetUid))) {
      activeAccount.status = status;
      activeAccount.artistStatus = status;
      activeAccount.adminVerified = isAdminVerified;
      if (isAdminVerified) activeAccount.verifiedAt = new Date().toISOString();
      safeSetItem('digipicture_user_account', activeAccount);
    }
  } catch (e) {
    console.error(e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('digipicture_artist_status_updated', {
      detail: {
        email: cleanEmail,
        uid: targetUid,
        status,
        adminVerified: isAdminVerified
      }
    }));
  }
};

export const verifyAndActivateArtistInFirestore = async (email: string): Promise<boolean> => {
  const cleanEmail = email.trim().toLowerCase();

  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
    try {
      await withTimeout(auth.currentUser.reload(), 3000);
    } catch (e) {
      console.warn("Auth user reload notice:", e);
    }
  }

  const isVerifiedInAuth = auth.currentUser?.emailVerified ?? false;

  let pendingDocData: any = null;
  try {
    const pendingRef = doc(db, 'pending_registrations', cleanEmail);
    const snap = await withTimeout(getDoc(pendingRef), 3000);
    if (snap.exists()) {
      pendingDocData = snap.data();
    }
  } catch (e) {
    console.warn("Error reading pending_registrations from Firestore:", e);
  }

  if (!pendingDocData) {
    try {
      const list = safeGetJSON<any[]>('digipicture_pending_registrations', []);
      if (Array.isArray(list)) {
        pendingDocData = list.find((a: any) => a && a.email?.toLowerCase() === cleanEmail);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (pendingDocData) {
    const targetUid = pendingDocData.uid || auth.currentUser?.uid || `uid-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const artistProfile: ArtistProfile = {
      uid: targetUid,
      email: cleanEmail,
      name: pendingDocData.name || 'Artist',
      username: pendingDocData.username || cleanEmail.split('@')[0],
      bio: pendingDocData.bio || '',
      role: 'artist',
      status: pendingDocData.status || 'pending',
      sampleImageUrl: pendingDocData.sampleImageUrl || '',
      isEmailVerified: true,
      createdAt: pendingDocData.createdAt || new Date().toISOString()
    };

    try {
      const artistUidRef = doc(db, 'artists', targetUid);
      const userUidRef = doc(db, 'users', targetUid);
      const artistEmailRef = doc(db, 'artists', cleanEmail);
      await Promise.all([
        withTimeout(setDoc(artistUidRef, artistProfile, { merge: true }), 3000),
        withTimeout(setDoc(userUidRef, artistProfile, { merge: true }), 3000),
        withTimeout(setDoc(artistEmailRef, artistProfile, { merge: true }), 3000),
        withTimeout(deleteDoc(doc(db, 'pending_registrations', cleanEmail)), 3000).catch(() => {})
      ]);
    } catch (e) {
      console.warn("Firestore artist activation write notice:", e);
    }

    try {
      const registered = safeGetJSON<any[]>('digipicture_registered_artists', []);
      const validRegistered = Array.isArray(registered) ? registered.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail) : [];
      validRegistered.push(artistProfile);
      safeSetItem('digipicture_registered_artists', validRegistered);

      const localPending = safeGetJSON<any[]>('digipicture_pending_registrations', []);
      if (Array.isArray(localPending)) {
        const updatedPending = localPending.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail);
        safeSetItem('digipicture_pending_registrations', updatedPending);
      }
    } catch (e) {
      console.error(e);
    }

    return true;
  }

  return isVerifiedInAuth;
};

export const sendVerificationEmail = async (user?: FirebaseUser) => {
  const currentUser = user || auth.currentUser;
  if (currentUser) {
    const email = currentUser.email || '';
    await sendEmailVerification(currentUser, {
      url: `${window.location.origin}${window.location.pathname}?verify_email=${encodeURIComponent(email)}`,
      handleCodeInApp: true
    });
  }
};

/**
 * Handle incoming email verification links from URL search parameters,
 * applying Firebase Auth action codes if present, and activating the artist in Firestore.
 */
export const handleIncomingEmailVerification = async (searchParams: URLSearchParams): Promise<string | null> => {
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  let email = searchParams.get('verify_email') || searchParams.get('email') || null;

  if (oobCode && (mode === 'verifyEmail' || !mode)) {
    try {
      const info = await checkActionCode(auth, oobCode);
      if (info?.data?.email) {
        email = info.data.email;
      }
      await applyActionCode(auth, oobCode);
    } catch (err) {
      console.warn("Firebase applyActionCode notice:", err);
    }
  }

  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    await verifyAndActivateArtistInFirestore(cleanEmail);
    return cleanEmail;
  }
  return null;
};

export const signOutFromFirebaseAndClearSession = async (): Promise<void> => {
  try {
    await withTimeout(signOut(auth), 3000);
  } catch (err) {
    console.warn("Firebase Auth signOut notice:", err);
  }

  try {
    sessionStorage.removeItem('digipicture_auth_token');
    sessionStorage.clear();
  } catch (e) {
    console.error("SessionStorage clear notice:", e);
  }

  try {
    localStorage.removeItem('digipicture_user_account');
    localStorage.removeItem('digipicture_active_artist');
    localStorage.removeItem('digipicture_is_admin');
    localStorage.removeItem('digipicture_admin_session');
    
    const list = safeGetJSON<any[]>('digipicture_registered_artists', []);
    if (Array.isArray(list)) {
      const sanitized = list.map((a: any) => ({ ...a, isLoggedIn: false }));
      safeSetItem('digipicture_registered_artists', sanitized);
    }
  } catch (e) {
    console.error("LocalStorage token purge notice:", e);
  }
};

export const purgeAllArtistApplicationsFromCloudAndLocal = async (): Promise<{
  deletedApplicationsCount: number;
}> => {
  let deletedApplicationsCount = 0;

  const appCollections = ['artist_applications', 'applications'];
  for (const colName of appCollections) {
    try {
      const colRef = collection(db, colName);
      const snap = await withTimeout(getDocs(colRef), 4000);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, colName, docSnap.id)).catch(() => {});
        deletedApplicationsCount++;
      }
    } catch (err) {
      console.warn(`Firestore ${colName} application purge notice:`, err);
    }
  }

  try {
    const pendingRef = collection(db, 'pending_registrations');
    const snap = await withTimeout(getDocs(pendingRef), 4000);
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, 'pending_registrations', docSnap.id)).catch(() => {});
      deletedApplicationsCount++;
    }
  } catch (err) {
    console.warn("Firestore pending_registrations purge notice:", err);
  }

  try {
    const artistsRef = collection(db, 'artists');
    const snap = await withTimeout(getDocs(artistsRef), 4000);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (
        data.status === 'pending' || 
        data.status === 'pending_application' || 
        data.artistStatus === 'pending_application' ||
        data.status === 'unapplied'
      ) {
        await deleteDoc(doc(db, 'artists', docSnap.id)).catch(() => {});
        deletedApplicationsCount++;
      }
    }
  } catch (err) {
    console.warn("Firestore artists pending purge notice:", err);
  }

  try {
    safeSetItem('digipicture_pending_registrations', []);
    const list = safeGetJSON<any[]>('digipicture_registered_artists', []);
    if (Array.isArray(list)) {
      const cleaned = list.filter((a: any) => 
        a.role === 'admin' || 
        (a.status !== 'pending' && a.status !== 'pending_application' && a.artistStatus !== 'pending_application')
      );
      safeSetItem('digipicture_registered_artists', cleaned);
    }
  } catch (e) {
    console.error("LocalStorage pending applications clear notice:", e);
  }

  return { deletedApplicationsCount };
};

export const purgeAllApplicationDataFromCloudAndLocal = async (): Promise<{
  deletedTotalCount: number;
  deletedArtistsCount: number;
  deletedBooksCount: number;
  deletedPendingCount: number;
  deletedReportsCount: number;
  deletedReviewsCount: number;
  deletedUsersCount: number;
}> => {
  let deletedTotalCount = 0;
  let deletedArtistsCount = 0;
  let deletedBooksCount = 0;
  let deletedPendingCount = 0;
  let deletedReportsCount = 0;
  let deletedReviewsCount = 0;
  let deletedUsersCount = 0;

  const collectionsToPurge = [
    'artists',
    'artist_applications',
    'applications',
    'books',
    'picturebooks',
    'reports',
    'reviews',
    'users',
    'pending_registrations',
    'subscribers',
    'direct_messages'
  ];

  for (const colName of collectionsToPurge) {
    try {
      const colRef = collection(db, colName);
      const snap = await withTimeout(getDocs(colRef), 4500);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, colName, docSnap.id)).catch(() => {});
        deletedTotalCount++;
        if (colName === 'artists') deletedArtistsCount++;
        else if (colName === 'books' || colName === 'picturebooks') deletedBooksCount++;
        else if (colName === 'pending_registrations' || colName === 'artist_applications' || colName === 'applications') deletedPendingCount++;
        else if (colName === 'reports') deletedReportsCount++;
        else if (colName === 'reviews') deletedReviewsCount++;
        else if (colName === 'users') deletedUsersCount++;
      }
    } catch (err) {
      console.warn(`Firestore collection '${colName}' purge notice:`, err);
    }
  }

  try {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (
        key.startsWith('digipicture_') || 
        key.startsWith('picturebook_') || 
        key.startsWith('pb_') ||
        key.includes('book') ||
        key.includes('artist') ||
        key.includes('report') ||
        key.includes('review')
      ) {
        localStorage.removeItem(key);
      }
    });

    const adminHashedPw = '$pbkdf2$v1$10000$ecefb0e5834ee971ed59e0bb2156891a$88ed978d97955e06802c5ca8f7fe0ebbce5261ff42c5360c554cebf44cbc4bcc';
    const cleanAdminAccount = [
      {
        role: 'admin',
        status: 'approved',
        name: 'System Administrator',
        email: 'yamauchiryoko16@gmail.com',
        username: '@admin',
        password: adminHashedPw,
        phone: '+1 555-0100',
        avatar: '🛡️',
        categories: ['System Moderation', 'Content Review'],
        bio: 'Official Platform Administrator & Content Reviewer',
        isLoggedIn: false,
        isEmailVerified: true
      }
    ];
    safeSetItem('digipicture_registered_artists', cleanAdminAccount);
    safeSetItem('digipicture_custom_books', []);
    safeSetItem('digipicture_pending_registrations', []);
    safeSetItem('digipicture_reading_progress', {});
    safeSetItem('digipicture_reports', []);
    safeSetItem('digipicture_reviews', {});
    safeSetItem('digipicture_direct_messages', []);
    safeSetItem('digipicture_subscriptions', []);
    safeSetItem('digipicture_bookmarks', {});
    safeSetItem('digipicture_discovered_items', {});
    safeSetItem('digipicture_unlocked_badges', {});
  } catch (e) {
    console.error("LocalStorage wipe notice:", e);
  }

  try {
    sessionStorage.clear();
  } catch (e) {
    console.error("SessionStorage wipe notice:", e);
  }

  try {
    await withTimeout(signOut(auth), 3000);
  } catch (e) {
    console.warn("Auth signout on purge notice:", e);
  }

  return {
    deletedTotalCount,
    deletedArtistsCount,
    deletedBooksCount,
    deletedPendingCount,
    deletedReportsCount,
    deletedReviewsCount,
    deletedUsersCount
  };
};

export const deleteArtistAccountFromCloudAndLocal = async (artistEmail: string): Promise<boolean> => {
  const cleanEmail = artistEmail.trim().toLowerCase();
  const cleanUid = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  const idsToPurge = Array.from(new Set([cleanEmail, cleanUid, artistEmail].filter(Boolean)));

  for (const id of idsToPurge) {
    try {
      await withTimeout(deleteDoc(doc(db, 'artists', id)), 3500);
      console.log("Deleted artist profile from Firestore artists collection:", id);
    } catch (e) {
      console.warn("Firestore delete artist notice:", e);
    }

    try {
      await withTimeout(deleteDoc(doc(db, 'users', id)), 3500);
      console.log("Deleted user profile from Firestore users collection:", id);
    } catch (e) {
      console.warn("Firestore delete user notice:", e);
    }
  }

  const collectionsToCheck = ['pending_registrations', 'artist_applications', 'applications'];
  for (const colName of collectionsToCheck) {
    for (const id of idsToPurge) {
      try {
        await deleteDoc(doc(db, colName, id)).catch(() => {});
      } catch (e) {
        console.warn(`Firestore ${colName} delete doc notice:`, e);
      }
    }
  }

  try {
    const currentUser = auth.currentUser;
    if (currentUser && (currentUser.email?.toLowerCase() === cleanEmail || idsToPurge.includes(currentUser.uid))) {
      await withTimeout(deleteUser(currentUser), 3500);
      console.log("Deleted Firebase Auth user:", cleanEmail);
    }
  } catch (err: any) {
    console.warn("Firebase Auth deleteUser notice:", err);
    try {
      await signOut(auth);
    } catch (e) {}
  }

  try {
    const list = safeGetJSON<any[]>('digipicture_registered_artists', []);
    if (Array.isArray(list)) {
      const filtered = list.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail && !idsToPurge.includes(a.uid));
      safeSetItem('digipicture_registered_artists', filtered);
    }

    const pList = safeGetJSON<any[]>('digipicture_pending_registrations', []);
    if (Array.isArray(pList)) {
      const filtered = pList.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail && !idsToPurge.includes(a.uid));
      safeSetItem('digipicture_pending_registrations', filtered);
    }

    const active = safeGetJSON<any>('digipicture_user_account', null);
    if (active && (active.email?.toLowerCase() === cleanEmail || idsToPurge.includes(active.uid))) {
      localStorage.removeItem('digipicture_user_account');
      localStorage.removeItem('digipicture_active_artist');
    }

    const pins = safeGetJSON<Record<string, string>>('digipicture_artist_pins', {});
    if (pins && typeof pins === 'object') {
      const updatedPins: Record<string, string> = {};
      Object.keys(pins).forEach(name => {
        if (name.toLowerCase() !== cleanEmail && !idsToPurge.includes(name)) {
          updatedPins[name] = pins[name];
        }
      });
      safeSetItem('digipicture_artist_pins', updatedPins);
    }
  } catch (e) {
    console.error("Local storage artist purge notice:", e);
  }

  await signOutFromFirebaseAndClearSession();

  return true;
};

export const deleteUserAccount = async (
  identifier: string,
  options: { cascadeBooks?: boolean; uid?: string; email?: string } = { cascadeBooks: true }
): Promise<{ success: boolean; deletedBooksCount: number }> => {
  const cleanId = (identifier || '').trim();
  const cleanEmail = (options.email || (cleanId.includes('@') ? cleanId : '')).trim().toLowerCase();
  const cleanUid = (options.uid || (!cleanId.includes('@') ? cleanId : '')).trim();
  let deletedBooksCount = 0;

  if (!cleanId && !cleanEmail && !cleanUid) return { success: false, deletedBooksCount: 0 };

  const idsToPurge = Array.from(new Set([cleanId, cleanEmail, cleanUid].filter(Boolean)));

  // Delete from artists collection: both by email and by UID
  for (const id of idsToPurge) {
    try {
      await withTimeout(deleteDoc(doc(db, 'artists', id)), 3500).catch(() => {});
    } catch (e) {
      console.warn("Firestore delete artist doc notice:", e);
    }
  }

  // Delete from users collection: both by UID and by email
  for (const id of idsToPurge) {
    try {
      await withTimeout(deleteDoc(doc(db, 'users', id)), 3500).catch(() => {});
    } catch (e) {
      console.warn("Firestore delete user doc notice:", e);
    }
  }

  // Delete from pending_registrations, artist_applications, applications
  const collectionsToCheck = ['pending_registrations', 'artist_applications', 'applications'];
  for (const colName of collectionsToCheck) {
    for (const id of idsToPurge) {
      try {
        await deleteDoc(doc(db, colName, id)).catch(() => {});
      } catch (e) {
        console.warn(`Firestore ${colName} delete doc notice:`, e);
      }
    }
  }

  // Cascade delete picturebooks and their associated storage assets
  if (options.cascadeBooks !== false) {
    try {
      const bookCollections = ['books', 'picturebooks'];
      for (const colName of bookCollections) {
        const colRef = collection(db, colName);
        const snapshot = await withTimeout(getDocs(colRef), 3500);
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const matchAuthorEmail = cleanEmail && data.authorEmail && data.authorEmail.toLowerCase() === cleanEmail;
          const matchUserId = idsToPurge.includes(data.userId);
          const matchAuthorId = idsToPurge.includes(data.authorId);
          const matchAuthor = idsToPurge.some(id => data.author && data.author.toLowerCase() === id.toLowerCase());

          if (matchAuthorEmail || matchUserId || matchAuthorId || matchAuthor) {
            await deleteBookFromFirestore(docSnap.id, data);
            deletedBooksCount++;
          }
        }
      }
    } catch (e) {
      console.warn("Firestore cascade delete books notice:", e);
    }

    try {
      const localBooks = safeGetJSON<any[]>('digipicture_custom_books', []);
      if (Array.isArray(localBooks)) {
        const remainingBooks: any[] = [];
        const deletedIds: string[] = [];
        localBooks.forEach((b: any) => {
          if (!b) return;
          const matchAuthorEmail = cleanEmail && b.authorEmail && b.authorEmail.toLowerCase() === cleanEmail;
          const matchUserId = idsToPurge.includes(b.userId);
          const matchAuthorId = idsToPurge.includes(b.authorId);
          const matchAuthor = idsToPurge.some(id => b.author && b.author.toLowerCase() === id.toLowerCase());
          if (matchAuthorEmail || matchUserId || matchAuthorId || matchAuthor) {
            if (b.id) deletedIds.push(b.id);
          } else {
            remainingBooks.push(b);
          }
        });
        safeSetItem('digipicture_custom_books', remainingBooks);

        if (deletedIds.length > 0) {
          const existingDeleted = safeGetJSON<string[]>('digipicture_deleted_book_ids', []);
          const updatedDeleted = Array.from(new Set([...(Array.isArray(existingDeleted) ? existingDeleted : []), ...deletedIds]));
          safeSetItem('digipicture_deleted_book_ids', updatedDeleted);
        }
      }
    } catch (e) {
      console.error("Local storage cascade books cleanup notice:", e);
    }
  }

  // Remove from local registries & cache
  try {
    const list = safeGetJSON<any[]>('digipicture_registered_artists', []);
    if (Array.isArray(list)) {
      const filtered = list.filter((a: any) => {
        if (!a) return false;
        const matchEmail = cleanEmail && a.email && a.email.toLowerCase() === cleanEmail;
        const matchUid = idsToPurge.includes(a.uid);
        const matchUsername = cleanEmail && a.username && a.username.toLowerCase() === cleanEmail;
        return !matchEmail && !matchUid && !matchUsername;
      });
      safeSetItem('digipicture_registered_artists', filtered);
    }

    const pList = safeGetJSON<any[]>('digipicture_pending_registrations', []);
    if (Array.isArray(pList)) {
      const filtered = pList.filter((a: any) => {
        if (!a) return false;
        const matchEmail = cleanEmail && a.email && a.email.toLowerCase() === cleanEmail;
        const matchUid = idsToPurge.includes(a.uid);
        return !matchEmail && !matchUid;
      });
      safeSetItem('digipicture_pending_registrations', filtered);
    }

    const deletedUsers = safeGetJSON<string[]>('digipicture_deleted_users', []);
    const updatedDeletedUsers = Array.from(new Set([...(Array.isArray(deletedUsers) ? deletedUsers : []), ...idsToPurge]));
    safeSetItem('digipicture_deleted_users', updatedDeletedUsers);

    const active = safeGetJSON<any>('digipicture_user_account', null);
    if (active && (idsToPurge.includes(active.email?.toLowerCase() || '') || idsToPurge.includes(active.uid))) {
      localStorage.removeItem('digipicture_user_account');
      localStorage.removeItem('digipicture_active_artist');
    }
  } catch (e) {
    console.error("Local storage cleanup notice:", e);
  }

  // Delete current authenticated user from Firebase Auth if matching
  try {
    const currentUser = auth.currentUser;
    if (currentUser && (idsToPurge.includes(currentUser.email?.toLowerCase() || '') || idsToPurge.includes(currentUser.uid))) {
      await withTimeout(deleteUser(currentUser), 3000);
    }
  } catch (err) {
    console.warn("Firebase Auth deleteUser notice:", err);
  }

  return { success: true, deletedBooksCount };
};

export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
export const googleProvider = provider;

export const handleGoogleAuth = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "artist_applications", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        status: "pending",
        createdAt: new Date()
      });
      console.log("Artist application submitted successfully!");
    }

    const artistRef = doc(db, "artists", user.uid);
    const userDocRef = doc(db, "users", user.uid);
    const googleProfile = {
      uid: user.uid,
      name: user.displayName || 'Artist',
      email: (user.email || '').toLowerCase(),
      avatar: '🎨',
      profilePicUrl: user.photoURL || '',
      role: 'artist',
      status: 'pending',
      isEmailVerified: user.emailVerified,
      createdAt: new Date().toISOString()
    };

    await Promise.all([
      setDoc(artistRef, googleProfile, { merge: true }),
      setDoc(userDocRef, googleProfile, { merge: true }),
      ...(user.email ? [setDoc(doc(db, "artists", user.email.toLowerCase()), googleProfile, { merge: true }).catch(() => {})] : [])
    ]);

    return { user, docSnap };
  } catch (error: any) {
    console.warn("Google authentication notice:", error?.message || error);
    let friendlyMessage = error?.message || 'Google sign-in could not be completed.';
    
    if (error?.code === 'auth/internal-error' || error?.code === 'auth/operation-not-allowed') {
      friendlyMessage = 'Google Sign-In is either not enabled in the Firebase Console (Authentication > Sign-in method) or restricted by the iframe environment. Please sign in with Email & Password or enable Google Sign-In in Firebase.';
    } else if (error?.code === 'auth/unauthorized-domain') {
      friendlyMessage = 'This preview domain is not in your Firebase Authorized Domains list. Please add this domain in Firebase Console (Authentication > Settings > Authorized domains) or sign in with Email & Password.';
    } else if (error?.code === 'auth/popup-blocked') {
      friendlyMessage = 'The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    } else if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      friendlyMessage = 'Google sign-in popup was closed before completion.';
    }

    const enhancedError = new Error(friendlyMessage);
    (enhancedError as any).code = error?.code;
    throw enhancedError;
  }
};

export { 
  sendPasswordResetEmail, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
};

export default app;
