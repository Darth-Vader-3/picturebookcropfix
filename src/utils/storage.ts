/**
 * Utility module for safe LocalStorage operations and Client-Side Image Compression
 * Prevents DOMException: QuotaExceededError when storing custom picture books & artwork.
 */

/**
 * Compresses an image file (JPEG, PNG, WEBP, etc.) client-side using HTML5 Canvas.
 * Significantly reduces image size (e.g. from 10MB -> ~150KB) while preserving high quality.
 */
export async function compressImageFile(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.82
): Promise<string> {
  // If not an image (e.g. video) or SVG/GIF where canvas scaling might lose animation/vector info,
  // return direct FileReader Data URL if small enough, or process if standard photo format.
  const isSvgOrGif = file.type.includes('svg') || file.type.includes('gif');
  
  if (!file.type.startsWith('image/') || isSvgOrGif) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to uncompressed data URL
          resolve(e.target?.result as string || '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG Data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        // Fallback on error
        resolve(e.target?.result as string || '');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Universal circular-reference safe JSON stringification utility for local storage.
 * Prevents "TypeError: Converting circular structure to JSON" when caching objects.
 */
export function safeJsonStringify(value: any, indent?: number): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (typeof (val as any).nodeType === 'number' || (typeof window !== 'undefined' && val instanceof Node)) {
            return `[DOMNode: ${(val as any).nodeName || 'Element'}]`;
          }
          if ('_reactName' in val || 'nativeEvent' in val) {
            return `[ReactSyntheticEvent: ${(val as any).type || (val as any)._reactName || 'Event'}]`;
          }
          if (key && (key.startsWith('__reactFiber') || key.startsWith('__reactEvents') || key.startsWith('__reactContainer'))) {
            return undefined;
          }
          if (val.$$typeof && typeof val.$$typeof === 'symbol') {
            return '[ReactElement]';
          }
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      },
      indent
    );
  } catch {
    return 'null';
  }
}

/**
 * Safely writes a key-value pair to localStorage with QuotaExceededError protection and fallback pruning.
 */
export function safeSetItem(key: string, value: any): boolean {
  try {
    const serialized = typeof value === 'string' ? value : safeJsonStringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`[LocalStorage] setItem failed for key "${key}" (Quota Exceeded). Running cleanup fallback...`, error);

    try {
      const stringValue = typeof value === 'string' ? value : safeJsonStringify(value);
      // 1. If key is custom books, trim heavy or old items for localStorage cache
      if (key === 'digipicture_custom_books') {
        const books = typeof value === 'object' && Array.isArray(value) ? value : safeParseJSON<any[]>(stringValue, []);
        if (Array.isArray(books) && books.length > 0) {
          // Keep only the most recent 5 books in offline local cache
          const trimmedBooks = books.slice(0, 5).map((book) => {
            return {
              ...book,
              pages: (book.pages || []).map((page: any, pIdx: number) => {
                if (pIdx > 1 && page.mediaUrl && page.mediaUrl.length > 300000) {
                  return { ...page, mediaUrl: undefined };
                }
                return page;
              })
            };
          });

          localStorage.setItem(key, safeJsonStringify(trimmedBooks));
          console.log(`[LocalStorage] Successfully saved lightweight fallback (${trimmedBooks.length} books) for "${key}".`);
          return true;
        }
      }

      // 2. Generic fallback: try clearing temporary non-essential keys
      const keysToClean = ['digipicture_reading_progress', 'digipicture_reports', 'digipicture_pending_registrations'];
      for (const k of keysToClean) {
        if (k !== key) {
          try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
        }
      }

      // Try setItem once more
      localStorage.setItem(key, stringValue);
      return true;
    } catch (fallbackError) {
      console.error(`[LocalStorage] Unable to write "${key}" to local cache due to strict browser quota. Data is retained in memory & database.`, fallbackError);
      return false;
    }
  }
}

/**
 * Safely parses any value (string, object, array, etc.) into typed data with fallback.
 * Prevents "Unexpected end of JSON input" and "Unexpected token" errors.
 */
export function safeParseJSON<T>(input: any, defaultValue: T): T {
  if (input === null || input === undefined) return defaultValue;
  if (typeof input !== 'string') {
    // Already parsed object/array/primitive
    return input as T;
  }
  const trimmed = input.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return defaultValue;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely reads a raw string value from localStorage.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[LocalStorage] getItem failed for key "${key}":`, e);
    return null;
  }
}

/**
 * Safely reads and parses a JSON value from localStorage with typed default value.
 */
export function safeGetJSON<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return safeParseJSON<T>(raw, defaultValue);
  } catch (e) {
    console.warn(`[LocalStorage] safeGetJSON failed for key "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[LocalStorage] removeItem failed for key "${key}":`, e);
  }
}
