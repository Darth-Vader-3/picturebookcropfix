// Secure crypto secret loaded from environment variables with fallback
const SYSTEM_CRYPTO_SECRET =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SYSTEM_CRYPTO_SECRET) ||
  'digipicture-secure-vault-key-2026-v1';

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export async function hashPasswordAsync(password: string): Promise<string> {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const saltHex = bufferToHex(salt.buffer);

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashHex = bufferToHex(derivedKey);
    return `$pbkdf2$v1$10000$${saltHex}$${hashHex}`;
  } catch (error) {
    console.error('Password hashing failed, fallback to SHA-256:', error);
    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(`salt_fall_${password}`));
    return `$sha256$v1$${bufferToHex(hashBuffer)}`;
  }
}

export async function verifyPasswordAsync(
  candidate: string,
  storedHash: string
): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!candidate || !storedHash) {
    return { isValid: false, needsRehash: false };
  }

  if (storedHash.startsWith('$pbkdf2$v1$')) {
    try {
      const parts = storedHash.split('$');
      const iterations = parseInt(parts[3], 10) || 10000;
      const saltHex = parts[4];
      const expectedHashHex = parts[5];

      const salt = hexToBuffer(saltHex);
      const encoder = new TextEncoder();

      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(candidate),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const derivedKey = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      const computedHashHex = bufferToHex(derivedKey);
      return { isValid: computedHashHex === expectedHashHex, needsRehash: false };
    } catch (e) {
      console.error('PBKDF2 verification error:', e);
      return { isValid: false, needsRehash: false };
    }
  }

  if (storedHash.startsWith('$sha256$v1$')) {
    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(`salt_fall_${candidate}`));
    const computed = `$sha256$v1$${bufferToHex(hashBuffer)}`;
    return { isValid: computed === storedHash, needsRehash: true };
  }

  const isPlainMatch = candidate === storedHash;
  return { isValid: isPlainMatch, needsRehash: isPlainMatch };
}

export interface SessionTokenPayload {
  email: string;
  role: 'admin' | 'artist' | 'student' | string;
  name: string;
  iat: number;
  exp: number;
  jti: string;
}

export async function generateSessionToken(
  user: { email: string; role: 'admin' | 'artist' | 'student' | string; name: string }
): Promise<string> {
  const iat = Date.now();
  const exp = iat + 24 * 60 * 60 * 1000;
  const jti = window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);

  const payload: SessionTokenPayload = {
    email: user.email,
    role: user.role,
    name: user.name,
    iat,
    exp,
    jti
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = btoa(payloadJson);

  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(SYSTEM_CRYPTO_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const signatureHex = bufferToHex(signatureBuffer);

  return `${payloadB64}.${signatureHex}`;
}

export async function verifySessionToken(
  token: string
): Promise<{ isValid: boolean; payload?: SessionTokenPayload; reason?: string }> {
  if (!token || !token.includes('.')) {
    return { isValid: false, reason: 'Invalid token structure' };
  }

  try {
    const [payloadB64, signatureHex] = token.split('.');
    const payloadJson = atob(payloadB64);
    const payload: SessionTokenPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return { isValid: false, reason: 'Session token expired' };
    }

    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(SYSTEM_CRYPTO_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const isValidSignature = await window.crypto.subtle.verify(
      'HMAC',
      key,
      hexToBuffer(signatureHex),
      encoder.encode(payloadB64)
    );

    if (!isValidSignature) {
      return { isValid: false, reason: 'Token signature mismatch' };
    }

    return { isValid: true, payload };
  } catch (err) {
    return { isValid: false, reason: 'Token decryption/parsing error' };
  }
}

export async function encryptSensitiveData(data: any): Promise<string> {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(SYSTEM_CRYPTO_SECRET),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('digipicture_salt_gcm'),
        iterations: 1000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encoder.encode(text)
    );

    const ivHex = bufferToHex(iv.buffer);
    const cipherHex = bufferToHex(encryptedBuffer);

    return `AES-GCM-v1:${ivHex}:${cipherHex}`;
  } catch (e) {
    console.error('AES-GCM Encryption failed, falling back to base64 encoding:', e);
    return `B64-v1:${btoa(encodeURIComponent(JSON.stringify(data)))}`;
  }
}

export async function decryptSensitiveData(encryptedString: string): Promise<any> {
  if (!encryptedString) return null;

  if (encryptedString.startsWith('B64-v1:')) {
    try {
      const raw = decodeURIComponent(atob(encryptedString.replace('B64-v1:', '')));
      return JSON.parse(raw);
    } catch (e) {
      return encryptedString;
    }
  }

  if (!encryptedString.startsWith('AES-GCM-v1:')) {
    try {
      return JSON.parse(encryptedString);
    } catch {
      return encryptedString;
    }
  }

  try {
    const parts = encryptedString.split(':');
    const ivHex = parts[1];
    const cipherHex = parts[2];

    const iv = hexToBuffer(ivHex);
    const cipherBuffer = hexToBuffer(cipherHex);

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(SYSTEM_CRYPTO_SECRET),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('digipicture_salt_gcm'),
        iterations: 1000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      cipherBuffer
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    try {
      return JSON.parse(decryptedText);
    } catch {
      return decryptedText;
    }
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}

export function sanitizeInput(input: string): string {
  if (!input) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeSqlInjection(input: string): string {
  if (!input) return '';
  return String(input)
    .replace(/('|"|;|\/\*|\*\/|--|UNION|SELECT|DROP|INSERT|DELETE|UPDATE|WHERE|EXEC|SCRIPT)/gi, '')
    .trim();
}

export function stripHtmlTags(input: string): string {
  if (!input) return '';
  return String(input).replace(/<[^>]*>?/gm, '');
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number;
  feedback: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { isValid: false, score: 0, feedback: ['Password is required'] };
  }

  if (password.length >= 8) score += 1;
  else feedback.push('Must be at least 8 characters long');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include at least one uppercase letter (A-Z)');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include at least one number (0-9)');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Include at least one special character (!@#$%^&*)');

  return {
    isValid: password.length >= 8 && score >= 2,
    score,
    feedback,
  };
}

class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    if (now - record.firstAttempt > windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count += 1;
    return true;
  }

  getRemainingTimeMs(key: string, windowMs: number = 60000): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    const elapsed = Date.now() - record.firstAttempt;
    return Math.max(0, windowMs - elapsed);
  }
}

export const securityRateLimiter = new RateLimiter();

export function hasPermission(
  userRole: 'admin' | 'artist' | 'student' | string,
  requiredRole: 'admin' | 'artist' | 'student'
): boolean {
  if (requiredRole === 'student') return true;
  if (requiredRole === 'artist') return userRole === 'artist' || userRole === 'admin';
  if (requiredRole === 'admin') return userRole === 'admin';
  return false;
}

export function validateProtectedRouteAccess(
  account: { isLoggedIn: boolean; role: 'admin' | 'artist' | 'student' | string },
  requiredRole: 'admin' | 'artist' | 'student' = 'artist'
): { isAuthorized: boolean; errorMessage?: string } {
  if (!account.isLoggedIn) {
    return {
      isAuthorized: false,
      errorMessage: 'Authentication required. Please log in or sign up to access this feature.'
    };
  }

  if (!hasPermission(account.role, requiredRole)) {
    return {
      isAuthorized: false,
      errorMessage: 'Access Denied. You do not have sufficient permissions for this workspace.'
    };
  }

  return { isAuthorized: true };
}

export interface FileValidationResult {
  isValid: boolean;
  errorMessage?: string;
  cleanFileName?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'svg',
]);

export function validateUploadedFile(file: File, maxSizeBytes: number = 10 * 1024 * 1024): FileValidationResult {
  if (!file) {
    return { isValid: false, errorMessage: 'No file provided.' };
  }

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      errorMessage: `File size exceeds the max allowed limit (${Math.round(maxSizeBytes / (1024 * 1024))}MB).`
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      isValid: false,
      errorMessage: `Unsupported file type (${file.type}). Only images (PNG, JPEG, WebP, GIF, SVG) are permitted.`
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      errorMessage: `Invalid file extension (.${ext}).`
    };
  }

  const cleanFileName = sanitizeInput(file.name.replace(/[^a-zA-Z0-9_.-]/g, '_'));
  return { isValid: true, cleanFileName };
}

export function sanitizeImageUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('data:image/jpeg') ||
      trimmed.startsWith('data:image/png') ||
      trimmed.startsWith('data:image/webp') ||
      trimmed.startsWith('data:image/gif') ||
      trimmed.startsWith('data:image/svg+xml')) {
    
    if (/<script|javascript:|onerror=|onload=/i.test(trimmed)) {
      console.warn('[Security Alert] Blocked suspicious script inside image data URI');
      return '';
    }
    return trimmed;
  }

  console.warn('[Security Alert] Blocked unapproved image URL scheme:', trimmed.slice(0, 30));
  return '';
}

export function sanitizeSvgContent(svgString: string): string {
  if (!svgString) return '';
  return svgString
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/href\s*=\s*(['"])\s*javascript:.*?\1/gi, '')
    .replace(/src\s*=\s*(['"])\s*javascript:.*?\1/gi, '');
}

export function sanitizeErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return stripHtmlTags(error).slice(0, 200);
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('Firebase') || msg.includes('Firestore') || msg.includes('apiKey')) {
      return 'A network operation failed securely. Please check your connection and try again.';
    }
    return stripHtmlTags(msg).slice(0, 200);
  }
  return 'An unexpected secure system error occurred.';
}
