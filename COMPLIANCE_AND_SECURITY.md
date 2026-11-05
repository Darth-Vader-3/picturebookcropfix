# Enterprise Security, Compliance & Governance Specification

## 1. Secrets & Environment Variable Protection
* **Zero Hardcoded Secrets**: All sensitive keys, API tokens, and credentials are abstracted into environment variables (`.env` / `process.env`).
* **Environment Separation**:
  * `GEMINI_API_KEY`: Kept strictly on the backend/server-side proxy layer.
  * `VITE_SYSTEM_CRYPTO_SECRET`: Used for cryptographic token signing and client-side encryption.
  * `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD_HASH`: Bootstrap administrative hash (PBKDF2-SHA256).
* **Git Integrity**: `.gitignore` strictly ignores `.env*`, `*.pem`, `*.key`, `*.secret`, and service account JSON files.

---

## 2. Cryptographic Standards & Session Security
* **Password Hashing**:
  * Standard: **PBKDF2 with SHA-256** and 10,000 derivation iterations.
  * Automatic salting with 16-byte cryptographically secure random values via Web Crypto API.
  * Zero plain-text password storage. Legacy hashes automatically upgraded upon successful login.
* **Session Tokens**:
  * Cryptographically signed tokens utilizing **HMAC-SHA256**.
  * Contains standard claims: `email`, `role`, `name`, `iat`, `exp` (24-hour expiration), and unique `jti`.
  * Tamper-evident: Alteration of the payload invalidates the signature and revokes access.
* **Data Encryption at Rest & in Transit**:
  * Sensitive data (e.g. backup bundles) encrypted via **AES-GCM-256** with unique initialization vectors (IVs).
  * Transport layer strictly enforces TLS 1.3/HTTPS.

---

## 3. Threat Mitigation & Input Sanitization
* **Injection Attacks (SQL / NoSQL / Command)**:
  * Strict schema enforcement via **Zod** (`/src/utils/validationSchemas.ts`).
  * `sanitizeSqlInjection` and `sanitizeInput` strips harmful characters (`<`, `>`, `"`, `'`, `/`, `&`).
  * All Firestore queries parameterized using standard SDK references (`where`, `doc`, `collection`).
* **Cross-Site Scripting (XSS)**:
  * Output encoding and tag stripping (`stripHtmlTags`).
  * Image URL validation (`sanitizeImageUrl`) restricts schemes to `https://`, `http://`, `blob:`, and safe image MIME data URIs, blocking `javascript:` and embedded `<script>` tags.
  * SVG content sanitization (`sanitizeSvgContent`) strips event handlers (`onerror`, `onload`, `onclick`) and script blocks.
* **Brute Force & Denial of Service (DoS)**:
  * Client and server rate limiter (`securityRateLimiter`) with sliding-window tracking.
  * Maximum 5 login attempts per minute per identifier.
  * Maximum 3 password reset requests per minute per IP/email.
* **File Upload Validation**:
  * MIME-type allowlist: PNG, JPEG, WebP, GIF, SVG.
  * Maximum size capped at 10 MB per image upload.
  * Filenames sanitized against path traversal (`../`) and illegal OS characters.

---

## 4. Role-Based Access Control (RBAC) & Route Guarding
| Role | Public Shelf | Story Reader | PictureBook Workbench | Admin Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| **Student / Reader** | Read | Read & Review | Access Denied | Access Denied |
| **Artist** | Read | Read & Review | Full Create/Edit/Publish | Access Denied |
| **Admin** | Full Access | Full Access | Full Access | Full Access & Moderation |

* Route transitions verified dynamically through `validateProtectedRouteAccess`.
* Firestore access verified at the database driver level through `firestore.rules`.

---

## 5. Regulatory Compliance & Children's Privacy

### 5.1 COPPA (Children’s Online Privacy Protection Act)
* DigiPicture is designed for picture books and family reading.
* Reader/Student modes do not require personal identifiable information (PII).
* Guest Explorer mode allows reading without account creation or email registration.
* Verified parental/artist consent workflow for creator accounts.

### 5.2 GDPR & CCPA (Data Privacy & User Rights)
* **Right to Access & Portability**: Users can export their entire reading history, profile data, and authored books as structured JSON/Vault snapshots via `createFullDatabaseSnapshot`.
* **Right to Erasure (Right to be Forgotten)**: Account deletion completely purges artist documents, authored books, and pending registrations from Firestore and local caches.
* **Data Minimization**: Only strictly required profile fields are collected.

---

## 6. Error Monitoring & Telemetry
* Monitored via `/src/utils/errorMonitoring.ts`.
* Automatically redacts sensitive fields (`password`, `secret`, `token`, `apiKey`, `AIzaSy...`) before recording error traces.
* Logs classified by severity (`info`, `warning`, `error`, `critical`) and domain (`security`, `database`, `network`, `auth`, `ui`).
