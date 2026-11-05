# Third-Party SDKs, External APIs & Dependency Manifest

This document formally declares all external software development kits (SDKs), cloud services, browser APIs, and open-source libraries integrated into the DigiPicture PictureBook application.

---

## 1. Cloud Infrastructure & Database Services

| SDK / Service | Version | Provider | Purpose | Security & Privacy Measures |
| :--- | :--- | :--- | :--- | :--- |
| **Firebase App & Firestore SDK** | `12.15.x` | Google Cloud | Persistent cloud storage for books, artists, reviews, and reports. | Hardened `firestore.rules` default-deny, client timeout guards, role-based access control. |
| **Firebase Authentication** | `12.15.x` | Google Cloud | User credential authentication and token validation. | Secure token exchange, no password logging in telemetry. |
| **Google Cloud Run (Antigravity/AI Studio Container)** | Native | Google Cloud | Production web container hosting and ingress proxy. | TLS 1.3 encryption, sandboxed container isolation on Port 3000. |

---

## 2. Cryptographic & Security Subsystems

| Module / API | Standard / Spec | Purpose | Verification Pattern |
| :--- | :--- | :--- | :--- |
| **Web Crypto API (`SubtleCrypto`)** | W3C Recommendation | Salted PBKDF2-SHA256 password hashing (10,000 rounds), HMAC-SHA256 session tokens, and AES-GCM-256 backup encryption. | Zero third-party network transmission; native hardware-accelerated cryptographic execution. |
| **Zod Schema Engine** | `^4.x` / `^3.x` | Runtime schema validation for all user registrations, book structures, reviews, and API calls. | Blocks SQL/NoSQL injection, strips unexpected properties, and enforces string bounds. |
| **Action Rate Limiting Middleware** | Custom Engine | Sliding-window attempt throttling on authentication, publishing, and report submissions. | Prevents brute-force dictionary attacks and automated DDoS spam. |

---

## 3. UI Framework, Rendering & Icons

| Library / Tool | Version | Purpose | Security Profile |
| :--- | :--- | :--- | :--- |
| **React & React DOM** | `19.0.x` | Core component lifecycle, reactive state management, and virtual DOM rendering. | Auto-escapes JSX text content preventing cross-site scripting (XSS). |
| **Vite** | `6.2.x` | Modern build tooling, fast bundling, and static asset pipeline. | Code splitting, asset minification, and tree shaking. |
| **Tailwind CSS** | `4.1.x` | Utility-first responsive styling and typography hierarchy. | Compile-time CSS compilation with zero runtime evaluation. |
| **Motion (`motion/react`)** | `12.23.x` | High-performance hardware-accelerated layout and UI transition animations. | CSS transform/opacity animations without DOM injection. |
| **Lucide React** | `^0.546.0` | Accessible, tree-shakeable vector icons. | Pure SVG inline components with zero external resource loading. |

---

## 4. Browser Multimedia & Hardware APIs

| API | Type | Purpose | Permission & Safety Controls |
| :--- | :--- | :--- | :--- |
| **HTML5 Canvas 2D API** | Web Standard | Interactive digital painting, stroke capture, and watermark stamping. | Isolated canvas rendering contexts, sanitizes raster input URLs. |
| **Web Audio API (`AudioContext`)** | Web Standard | Synthesizes interactive chimes, ambient tones, and audio feedback. | Lazy initialization upon user touch/click interaction. |
| **Web Speech API (`SpeechSynthesis`)** | Web Standard | Bilingual story narration reading in English and Swahili. | Local client speech synthesis with zero voice audio transmission to external servers. |
| **Web Storage API (`localStorage`)** | Web Standard | Client-side caching of reading progress, theme mode, and offline book drafts. | Protected by browser origin isolation (`Same-Origin Policy`). |

---

## 5. Telemetry & Crash Monitoring

| Subsystem | File Path | Purpose | PII Protection |
| :--- | :--- | :--- | :--- |
| **Error Monitoring Engine** | `/src/utils/errorMonitoring.ts` | Captures uncaught frontend exceptions and runtime failures. | Automatically scrubs API keys (`AIzaSy...`), passwords, tokens, and authorization headers before logging. |
| **React Error Boundary** | `/src/components/ErrorBoundary.tsx` | Provides user-friendly recovery screen and diagnostic reporting on component crashes. | Redacts stack traces and isolates crashing components to protect user data. |
