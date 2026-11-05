# Privacy Policy for DigiPicture PictureBook

**Last Updated:** August 25, 2026  
**Effective Date:** August 25, 2026

DigiPicture PictureBook ("we", "our", or "the Platform") is dedicated to providing a safe, educational, and creative digital picture storybook experience for children, students, parents, educators, and artists worldwide.

We take privacy and safety seriously, adhering strictly to the **Children’s Online Privacy Protection Act (COPPA)**, the **General Data Protection Regulation (GDPR)**, and the **California Consumer Privacy Act (CCPA)**.

---

## 1. Summary of Core Privacy Commitments
- **Zero Behavioral Ads & Third-Party Tracking**: We do NOT display targeted advertisements or sell user data to data brokers.
- **Children's Privacy Protection (COPPA Compliance)**: Reader and Student modes require **NO personal identifying information (PII)** or email addresses to explore curated or published picture books.
- **Data Minimization**: We only collect the minimal information necessary to provide the interactive storytelling, painting, audio narration, and creator studio tools.
- **Strong Encryption Standards**: All sensitive data is hashed using PBKDF2-SHA256 and encrypted via AES-GCM.

---

## 2. Information We Collect

### A. Reader & Student Mode (General Users & Children)
- **Zero PII Collected**: Children and general readers do not need to register, provide email addresses, or create public profiles to read picture books.
- **Local Reading History**: Bookmarks, page progress, earned exploration passport stamps, and UI preferences (e.g., Night Mode, Swahili/English language selection) are stored strictly on the local device (`localStorage`).

### B. Creator & Artist Accounts
For artists who register to create, edit, and publish picture books:
- **Profile Information**: Display Name, Username (optional), Email address (used for authentication and notifications), Bio/Artistic Specialization, and Profile Avatar.
- **Authored Content**: Picture book titles, text scripts, canvas illustration strokes, uploaded artwork, audio narration recordings, and category tags.
- **Credentials**: Passwords are never stored in plaintext. They are salted with 16-byte cryptographically secure random values and hashed via PBKDF2 with 10,000 SHA-256 iterations.

### C. Community Moderation & Reader Feedback
- **Star Ratings & Reviews**: Readers can submit star reviews (1-5) and constructive book comments.
- **Safety & Content Reports**: Parents and educators can flag inappropriate content or report copyright issues. These reports contain the reported book ID, category, timestamp, and optional reporter contact.

### D. Automated Error & Crash Telemetry
- **Redacted Runtime Errors**: When an unhandled error occurs, technical diagnostic logs (stack trace, browser version, and component failure tree) are recorded.
- **PII Scrubbing**: All passwords, session tokens, API keys, and authorization headers are automatically stripped using regex sanitization filters before storage or remote dispatch.

---

## 3. How We Use Information
We utilize collected information strictly to:
1. Deliver and render interactive picture books across web and mobile browsers.
2. Provide painting canvas, sculpture viewing, and storybook authoring tools.
3. Authenticate and manage creator permissions and artist verification statuses.
4. Enforce community guidelines and remove prohibited content.
5. Diagnose performance bottlenecks, system faults, and security vulnerabilities.

---

## 4. Third-Party Service Providers & SDKs
We integrate only trusted infrastructure and SDK providers:
- **Google Cloud Platform & Firebase**: Real-time cloud database (Firestore), security rules, and hosting.
- **Web Audio API & SpeechSynthesis**: Browser-native sound effects and bilingual narration synthesis.
- **Zod Schema Engine**: Type-safe payload validation to prevent injection attacks.
- **Lucide Icons**: Scalable SVG visual assets rendered locally in memory.

*We do NOT share data with advertising networks or social tracking pixels.*

---

## 5. Parental Rights & Data Management (COPPA & GDPR)
Parents, guardians, and adult users have the following rights at all times:
- **Right of Access & Portability**: You may request or export a complete machine-readable copy of your profile and authored books (`.json` or encrypted `.vault` bundle).
- **Right to Rectification**: You can edit or update your artist profile, username, or published books.
- **Right to Erasure (Right to Be Forgotten)**: You can permanently delete your account and all authored content directly from the Creator Studio settings.
- **Parental Inquiries**: Parents can contact our Safety Desk at `support@digipicture.org` or `yamauchiryoko16@gmail.com` to review or purge any content.

---

## 6. Security Invariants
- **Default-Deny Access Controls**: Firestore rules deny all unauthenticated writes by default.
- **Rate-Limiting Middleware**: Sliding-window rate limiters prevent brute-force login attempts and spam submissions.
- **XSS & Injection Protection**: HTML sanitization, SVG event-handler stripping, and URL scheme verification.

---

## 7. Changes to this Policy
We may periodically update this Privacy Policy. Any material modifications will be clearly communicated within the application. Continued use of DigiPicture constitutes acceptance of the updated terms.
