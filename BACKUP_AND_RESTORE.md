# Database Security, Backup & Disaster Recovery Architecture

## 1. Overview
DigiPicture PictureBook employs an enterprise-grade, defense-in-depth security model coupled with automated point-in-time recovery mechanisms. The application combines Firestore Cloud Database persistence with client-side encrypted vault snapshots to ensure zero data loss and sub-minute recovery in disaster scenarios.

---

## 2. Security Invariants & Access Control

### 2.1 Database Security Rules (Firestore Rules)
All database operations are governed by hardened, non-bypassable security rules in `firestore.rules`:
* **Default Deny**: Any unmatched document path rejects all read and write requests automatically.
* **Strict Role-Based Access Control (RBAC)**:
  * `admin`: Full administrative control, content moderation, user status updates, and audit log access.
  * `artist`: Full CRUD on authored books (`books/{bookId}`) and own artist profile (`artists/{email}`).
  * `student` / `reader`: Read-only access to published books and artist directory; write access restricted to validated star reviews.
* **Input Size & Type Validation**:
  * String length caps (`title` ≤ 150 chars, `author` ≤ 100 chars, `bio` ≤ 1000 chars).
  * URL scheme verification (only valid `https://`, `http://`, `blob:`, or safe `data:image/*` URIs).
  * Payload size limits preventing resource exhaustion attacks.

---

## 3. Backup Strategy & Automation

### 3.1 Backup Channels
1. **Cloud Native Firestore Backups (GCP Managed)**:
   * Scheduled daily backups via Google Cloud Firestore managed exports to Google Cloud Storage (GCS).
   * Point-in-time recovery (PITR) enabled with retention up to 7 days.
2. **Encrypted Vault Snapshots (Application Layer)**:
   * Accessible via `/src/utils/backupRestore.ts`.
   * Exports full JSON database states encrypted with AES-GCM-256 (`.vault` files).
   * Generates SHA-256 integrity checksums to prevent corruption or tampering during transit.

### 3.2 Programmatic Snapshot API
```typescript
import { createFullDatabaseSnapshot, exportEncryptedBackupBundle, restoreDatabaseFromSnapshot } from './src/utils/backupRestore';

// 1. Create a point-in-time snapshot
const snapshot = await createFullDatabaseSnapshot();

// 2. Export encrypted backup bundle (.vault)
await exportEncryptedBackupBundle(true);

// 3. Restore from snapshot or encrypted vault file
const result = await restoreDatabaseFromSnapshot(snapshot);
console.log(result.message);
```

---

## 4. Disaster Recovery Runbook

### Scenario A: Accidental Book or Artist Profile Deletion
1. Obtain the most recent `.vault` or `.json` snapshot from the backup repository or local vault storage.
2. Navigate to the Admin / Security Console or invoke `restoreDatabaseFromSnapshot(fileContent)`.
3. The engine will batch-restore documents into Firestore with merge operations and synchronize client caches.

### Scenario B: Database Region Outage / Corrupted Collection
1. Google Cloud Console -> Firestore -> Backups -> Restore Database.
2. Specify the recovery timestamp (`pitrTimestamp`).
3. Point application endpoints to the restored Firestore database ID.

---

## 5. Verification & Testing
* **Checksum Integrity Check**: Every snapshot contains an SHA-256 hash calculated over the canonical JSON payload. Restores will abort if hash mismatch is detected.
* **Schema Validation**: Restored records are validated against `validationSchemas.ts` (`BookSchema`, `UserRegistrationSchema`, `ReportSchema`) before committing writes.
