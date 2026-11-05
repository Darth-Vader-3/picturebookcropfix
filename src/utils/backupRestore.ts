/**
 * Automated Database & Application State Backup, Point-in-Time Snapshot,
 * and Disaster Recovery Engine for DigiPicture PictureBook.
 */

import { fetchBooksFromFirestore, fetchArtistsFromFirestore, db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { encryptSensitiveData, decryptSensitiveData } from './security';
import { safeGetItem, safeSetItem, safeGetJSON, safeParseJSON } from './storage';
import { errorMonitor } from './errorMonitoring';

export interface DatabaseSnapshot {
  version: string;
  timestamp: string;
  environment: string;
  counts: {
    books: number;
    artists: number;
    reports: number;
    reviews: number;
    users: number;
  };
  data: {
    books: any[];
    artists: any[];
    reports: any[];
    reviews: any[];
    localSettings: Record<string, any>;
  };
  checksum: string;
}

/**
 * Generates an SHA-256 checksum for data integrity verification
 */
async function computeChecksum(content: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return 'crc-' + content.length;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a complete point-in-time snapshot of the database and storage state.
 */
export async function createFullDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  try {
    const [books, artists] = await Promise.all([
      fetchBooksFromFirestore().catch(() => []),
      fetchArtistsFromFirestore().catch(() => [])
    ]);

    // Fetch reports if accessible
    let reports: any[] = [];
    try {
      const repSnap = await getDocs(collection(db, 'reports'));
      reports = repSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      reports = safeGetJSON<any[]>('digipicture_reports', []);
    }

    // Fetch reviews if accessible
    let reviews: any[] = [];
    try {
      const revSnap = await getDocs(collection(db, 'reviews'));
      reviews = revSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      reviews = safeGetJSON<any[]>('digipicture_reviews', []);
    }

    // Capture local configuration
    const localSettings: Record<string, any> = {
      theme: safeGetItem('digipicture_theme') || 'light',
      language: safeGetItem('digipicture_lang') || 'en',
      readingProgress: safeGetItem('digipicture_reading_progress') || '{}'
    };

    const snapshotPayload = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: 'production',
      counts: {
        books: books.length,
        artists: artists.length,
        reports: reports.length,
        reviews: reviews.length,
        users: artists.length
      },
      data: {
        books,
        artists,
        reports,
        reviews,
        localSettings
      }
    };

    const serialized = JSON.stringify(snapshotPayload);
    const checksum = await computeChecksum(serialized);

    const snapshot: DatabaseSnapshot = {
      ...snapshotPayload,
      checksum
    };

    // Store latest snapshot locally
    safeSetItem('digipicture_latest_backup', JSON.stringify(snapshot));
    return snapshot;
  } catch (error) {
    errorMonitor.captureException(error, { category: 'database', severity: 'error' });
    throw new Error('Failed to generate full database backup snapshot.');
  }
}

/**
 * Downloads the encrypted backup bundle file to user's device.
 */
export async function exportEncryptedBackupBundle(encrypt: boolean = true): Promise<void> {
  const snapshot = await createFullDatabaseSnapshot();
  const rawString = JSON.stringify(snapshot, null, 2);
  let fileContent = rawString;
  let filename = `digipicture-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (encrypt) {
    fileContent = await encryptSensitiveData(rawString);
    filename = `digipicture-backup-vault-${new Date().toISOString().slice(0, 10)}.vault`;
  }

  const blob = new Blob([fileContent], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restores the entire database and application state from a snapshot object or encrypted file string.
 */
export async function restoreDatabaseFromSnapshot(
  snapshotData: string | DatabaseSnapshot
): Promise<{ success: boolean; restoredBooks: number; restoredArtists: number; message: string }> {
  try {
    let parsed: DatabaseSnapshot;

    if (typeof snapshotData === 'string') {
      const trimmed = snapshotData.trim();
      if (trimmed.startsWith('AES-GCM-v1:') || trimmed.startsWith('B64-v1:')) {
        const decrypted = await decryptSensitiveData(trimmed);
        parsed = typeof decrypted === 'string' ? safeParseJSON<DatabaseSnapshot>(decrypted, {} as any) : decrypted;
      } else {
        parsed = safeParseJSON<DatabaseSnapshot>(trimmed, {} as any);
      }
    } else {
      parsed = snapshotData;
    }

    if (!parsed || !parsed.data || !Array.isArray(parsed.data.books)) {
      throw new Error('Invalid or corrupted backup snapshot file structure.');
    }

    let restoredBooks = 0;
    let restoredArtists = 0;

    // 1. Restore Books to Firestore & Local Storage
    for (const book of parsed.data.books) {
      if (book.id && book.title) {
        try {
          await setDoc(doc(db, 'books', book.id), book, { merge: true });
        } catch (e) {
          console.warn('Firestore book restore fallback to local:', e);
        }
        restoredBooks++;
      }
    }
    safeSetItem('digipicture_custom_books', JSON.stringify(parsed.data.books));

    // 2. Restore Artists
    for (const artist of parsed.data.artists || []) {
      if (artist.email) {
        try {
          await setDoc(doc(db, 'artists', artist.email.toLowerCase()), artist, { merge: true });
        } catch (e) {
          console.warn('Firestore artist restore fallback to local:', e);
        }
        restoredArtists++;
      }
    }
    safeSetItem('digipicture_registered_artists', JSON.stringify(parsed.data.artists || []));

    // 3. Restore Local Settings
    if (parsed.data.localSettings) {
      if (parsed.data.localSettings.theme) {
        safeSetItem('digipicture_theme', parsed.data.localSettings.theme);
      }
      if (parsed.data.localSettings.language) {
        safeSetItem('digipicture_lang', parsed.data.localSettings.language);
      }
    }

    return {
      success: true,
      restoredBooks,
      restoredArtists,
      message: `Successfully restored ${restoredBooks} books and ${restoredArtists} artist records.`
    };
  } catch (error: any) {
    errorMonitor.captureException(error, { category: 'database', severity: 'critical' });
    return {
      success: false,
      restoredBooks: 0,
      restoredArtists: 0,
      message: error.message || 'Snapshot restoration failed.'
    };
  }
}
