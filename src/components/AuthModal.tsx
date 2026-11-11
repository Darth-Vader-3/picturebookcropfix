import React, { useState, useEffect, useRef } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  registerArtistWithFirebase,
  verifyAndActivateArtistInFirestore,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendEmailVerification,
  signOutFromFirebaseAndClearSession,
  resolveEmailFromIdentifier,
  fetchArtistsFromFirestore,
  getUserAndArtistDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  auth,
  db
} from '../firebase';
import {
  User,
  Mail,
  Lock,
  Phone,
  Palette,
  Sparkles,
  Check,
  ArrowRight,
  LogIn,
  UserPlus,
  ShieldCheck,
  Camera,
  Globe,
  Tag,
  HelpCircle,
  Clock,
  X,
  Upload,
  Plus
} from 'lucide-react';
import { playChime, maskEmail } from '../data';
import { isValidEmail, securityRateLimiter, sanitizeInput, sanitizeSqlInjection, evaluatePasswordStrength, hashPasswordAsync, verifyPasswordAsync, generateSessionToken } from '../utils/security';
import { UserRegistrationSchema, UserLoginSchema, validateWithSchema } from '../utils/validationSchemas';
import { safeGetJSON, safeSetItem, compressImageFile } from '../utils/storage';

import { UserAccount, UserRole, UserStatus } from '../types';
export type { UserAccount };

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (account: UserAccount) => void;
  currentAccount: UserAccount;
  language: 'en' | 'sw';
  theme?: 'day' | 'night';
  onLogout?: () => Promise<void> | void;
  initialStep?: 'role_select' | 'artist_auth' | 'student_setup';
  initialAuthTab?: 'login' | 'signup' | 'forgot_password' | 'email_verification';
  initialLoginEmail?: string;
  initialSuccessNotice?: string;
}

const ARTIST_CATEGORIES = [
  'Sculpture & Clay',
  'Watercolor & Painting',
  'Origami & Papercraft',
  'Storybook Illustration',
  '3D Modeling & Crafts',
  'Animation & Puppetry',
  'Digital Art & Fine Art'
];

const PRESET_AVATARS = ['🎨', '👩‍🎨', '🧑‍🎨', '👨‍🎨', '🖌️', '🎭', '🦊', '🦁', '🐼', '🦄', '🦉', '🐯', '🐰', '🌟', '🚀', '🔮'];

export default function AuthModal({
  isOpen,
  onClose,
  onAuthenticate,
  currentAccount,
  language,
  theme = 'day',
  onLogout,
  initialStep,
  initialAuthTab,
  initialLoginEmail,
  initialSuccessNotice
}: AuthModalProps) {
  const isNight = theme === 'night';

  // View mode: 'role_select' | 'artist_auth' | 'student_setup'
  const [selectedRole, setSelectedRole] = useState<'artist' | 'student'>('artist');
  const [step, setStep] = useState<'role_select' | 'artist_auth' | 'student_setup'>('role_select');
  
  // Artist auth tab: 'login' | 'signup' | 'forgot_password' | 'email_verification'
  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'forgot_password' | 'email_verification'>('login');

  // Synchronize initial state when opening or when initial props update
  useEffect(() => {
    if (isOpen) {
      if (initialStep) setStep(initialStep);
      if (initialAuthTab) setAuthTab(initialAuthTab);
      if (initialLoginEmail) setLoginIdentifier(initialLoginEmail);
      if (initialSuccessNotice) {
        setSuccessNotice(initialSuccessNotice);
        setErrorMessage(null);
      }
    }
  }, [isOpen, initialStep, initialAuthTab, initialLoginEmail, initialSuccessNotice]);

  // Forgot Password state
  const [resetEmail, setResetEmail] = useState('');
  const [sentResetEmail, setSentResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('🎨');
  const [signupProfilePicUrl, setSignupProfilePicUrl] = useState('');
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage(language === 'en' ? 'Please select a valid image file (PNG, JPG, WEBP).' : 'Tafadhali chagua faili halali ya picha (PNG, JPG, WEBP).');
      return;
    }

    try {
      setIsProcessingPhoto(true);
      const compressedDataUrl = await compressImageFile(file, 600, 600, 0.85);
      setSignupProfilePicUrl(compressedDataUrl);
      playChime('sparkle');
    } catch (err) {
      console.error('Error reading/compressing photo:', err);
      setErrorMessage(language === 'en' ? 'Failed to process photo. Please try a different image.' : 'Imeshindwa kusindika picha. Tafadhali jaribu picha nyingine.');
    } finally {
      setIsProcessingPhoto(false);
      if (photoFileInputRef.current) {
        photoFileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setSignupProfilePicUrl('');
    if (photoFileInputRef.current) {
      photoFileInputRef.current.value = '';
    }
    playChime('pop');
  };

  const handleAddCustomAvatar = () => {
    const trimmed = customAvatarInput.trim();
    if (!trimmed) return;
    setSignupAvatar(trimmed);
    setSignupProfilePicUrl('');
    setCustomAvatarInput('');
    setShowCustomAvatarInput(false);
    playChime('sparkle');
  };
  const [signupSampleImageUrl, setSignupSampleImageUrl] = useState('');
  // State array for selected categories and auto-synchronized specialization text
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Storybook Illustration', 'Sculpture & Clay']);
  const signupCategories = selectedCategories;
  const setSignupCategories = setSelectedCategories;
  const [signupSpecialization, setSignupSpecialization] = useState('Storybook Illustration, Sculpture & Clay');
  const [signupBio, setSignupBio] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Student quick setup state
  const [studentName, setStudentName] = useState('Student Reader');
  const [studentAvatar, setStudentAvatar] = useState('🎓');

  // Error and notice state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Email Verification States
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [pendingVerificationName, setPendingVerificationName] = useState<string>('');
  const [showVerificationBox, setShowVerificationBox] = useState<boolean>(false);

  // Helper to load registered artists from localStorage with initial seeds if empty
  const getRegisteredArtists = (): any[] => {
    const adminHashedPw = '$pbkdf2$v1$10000$ecefb0e5834ee971ed59e0bb2156891a$88ed978d97955e06802c5ca8f7fe0ebbce5261ff42c5360c554cebf44cbc4bcc';
    const demoHashedPw = '$pbkdf2$v1$10000$af0a0719386aebe530a1965048d00b69$11f7677dee1bc9aa84bf7338d938aa0f0274efbd975e2cc390a6b915594bb957';

    try {
      const parsed = safeGetJSON<any[]>('digipicture_registered_artists', []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure current admin email and hashed password are up-to-date in local cache
        let hasOldAdmin = parsed.some((a: any) => a.email?.toLowerCase() === 'informationpicturebook@gmail.com');
        let hasNewAdmin = parsed.some((a: any) => a.email?.toLowerCase() === 'yamauchiryoko16@gmail.com');
        let needsPwUpdate = parsed.some((a: any) => a.email?.toLowerCase() === 'yamauchiryoko16@gmail.com' && a.password !== adminHashedPw);
        if (hasOldAdmin || !hasNewAdmin || needsPwUpdate) {
          const updated = parsed.map((a: any) => {
            if (a.email?.toLowerCase() === 'informationpicturebook@gmail.com' || a.email?.toLowerCase() === 'yamauchiryoko16@gmail.com' || (a.role === 'admin' && a.email?.toLowerCase() !== 'admin@picturebook.com')) {
              return {
                ...a,
                email: 'yamauchiryoko16@gmail.com',
                password: adminHashedPw
              };
            }
            return a;
          });
          if (!updated.some((a: any) => a.email?.toLowerCase() === 'yamauchiryoko16@gmail.com')) {
            updated.unshift({
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
            });
          }
          safeSetItem('digipicture_registered_artists', updated);
          return updated;
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    const seedArtists = [
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
    safeSetItem('digipicture_registered_artists', seedArtists);
    return seedArtists;
  };

  const getPendingRegistrations = (): any[] => {
    return safeGetJSON<any[]>('digipicture_pending_registrations', []);
  };

  const savePendingRegistration = (artist: any) => {
    try {
      let pending = getPendingRegistrations();
      pending = Array.isArray(pending) ? pending.filter((a: any) => a && a.email?.toLowerCase() !== artist.email?.toLowerCase()) : [];
      pending.push(artist);
      safeSetItem('digipicture_pending_registrations', pending);
    } catch (e) {
      console.error(e);
    }
  };

  const verifyEmailAndRedirectToLogin = async (emailToVerify: string) => {
    const clean = emailToVerify.trim().toLowerCase();

    // Activate in Firebase Firestore database
    await verifyAndActivateArtistInFirestore(clean);
    
    // Check pending registrations first
    let pendingList = getPendingRegistrations();
    const pendingAccount = Array.isArray(pendingList) ? pendingList.find((a: any) => a && a.email?.toLowerCase() === clean) : null;

    const registered = getRegisteredArtists();
    let foundIndex = Array.isArray(registered) ? registered.findIndex((a: any) => a && a.email?.toLowerCase() === clean) : -1;

    if (pendingAccount) {
      // Save account to registered artists list now that email is verified!
      const verifiedAccount = { ...pendingAccount, isEmailVerified: true };
      if (foundIndex !== -1) {
        registered[foundIndex] = verifiedAccount;
      } else {
        registered.push(verifiedAccount);
      }
      safeSetItem('digipicture_registered_artists', registered);

      // Remove from pending registrations
      pendingList = Array.isArray(pendingList) ? pendingList.filter((a: any) => a && a.email?.toLowerCase() !== clean) : [];
      safeSetItem('digipicture_pending_registrations', pendingList);
    } else if (foundIndex !== -1) {
      registered[foundIndex].isEmailVerified = true;
      safeSetItem('digipicture_registered_artists', registered);
    }

    // Redirect to login tab in AuthModal
    setStep('artist_auth');
    setAuthTab('login');
    setLoginIdentifier(clean);
    setLoginPassword('');
    setShowVerificationBox(false);
    setErrorMessage(null);
    setSuccessNotice(
      language === 'en'
        ? `🎉 Email verified successfully for ${clean}! Your studio account has been created and saved. Please enter your password to log in.`
        : `🎉 Barua pepe ${clean} imethibitishwa kwa mafanikio! Akaunti yako imeundwa na kuhifadhiwa. Ingiza nenosiri lako ili kuingia.`
    );
    playChime('sparkle');
  };

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    playChime('pop');
    setSelectedCategories((prev) => {
      const nextCategories = prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat];

      // Format selected category array into comma-separated string
      // Allow custom editing: preserve any manually added niche details not in ARTIST_CATEGORIES
      const currentTokens = signupSpecialization
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const customTokens = currentTokens.filter(
        (token) => !ARTIST_CATEGORIES.some((c) => c.toLowerCase() === token.toLowerCase())
      );

      const formattedSpecialization = customTokens.length > 0
        ? [...nextCategories, ...customTokens].join(', ')
        : nextCategories.join(', ');

      setSignupSpecialization(formattedSpecialization);
      return nextCategories;
    });
  };

  const handleArtistLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanInput = sanitizeSqlInjection(sanitizeInput(loginIdentifier.trim().toLowerCase()));
    if (!cleanInput) {
      setErrorMessage(
        language === 'en'
          ? 'Please enter your email or artist username.'
          : 'Tafadhali ingiza barua pepe au jina la mtumiaji.'
      );
      return;
    }

    if (!securityRateLimiter.isAllowed(`login:${cleanInput}`, 5, 60000)) {
      const waitSec = Math.ceil(securityRateLimiter.getRemainingTimeMs(`login:${cleanInput}`, 60000) / 1000);
      setErrorMessage(
        language === 'en'
          ? `Too many login attempts. Please wait ${waitSec} seconds before trying again.`
          : `Majaribio mengi ya kuingia. Tafadhali subiri sekunde ${waitSec} kabla ya kujaribu tena.`
      );
      return;
    }

    if (!loginPassword) {
      setErrorMessage(
        language === 'en'
          ? 'Please enter your password.'
          : 'Tafadhali ingiza nenosiri lako.'
      );
      return;
    }

    let resolvedEmail = cleanInput;
    if (!cleanInput.includes('@')) {
      const dbEmail = await resolveEmailFromIdentifier(cleanInput);
      if (dbEmail) {
        resolvedEmail = dbEmail;
      }
    } else if (!cleanInput.includes('.')) {
      const dbEmail = await resolveEmailFromIdentifier(cleanInput);
      if (dbEmail) {
        resolvedEmail = dbEmail;
      }
    }

    let registeredArtists = getRegisteredArtists();
    const cleanHandle = cleanInput.startsWith('@') ? cleanInput : `@${cleanInput}`;
    
    let foundIndex = registeredArtists.findIndex(
      (a: any) =>
        a.email?.toLowerCase() === resolvedEmail ||
        a.email?.toLowerCase() === cleanInput ||
        a.username?.toLowerCase() === cleanInput ||
        a.username?.toLowerCase() === cleanHandle
    );

    if (foundIndex === -1) {
      try {
        const { artistDoc, userDoc, pendingDoc } = await getUserAndArtistDoc(resolvedEmail);
        const remoteDoc = artistDoc || userDoc || pendingDoc;
        if (remoteDoc) {
          registeredArtists.push(remoteDoc);
          safeSetItem('digipicture_registered_artists', registeredArtists);
          foundIndex = registeredArtists.length - 1;
        } else {
          const remoteArtists = await fetchArtistsFromFirestore(30);
          if (Array.isArray(remoteArtists) && remoteArtists.length > 0) {
            const match = remoteArtists.find((a: any) =>
              a.email?.toLowerCase() === resolvedEmail ||
              a.email?.toLowerCase() === cleanInput ||
              a.username?.toLowerCase() === cleanInput ||
              a.username?.toLowerCase() === cleanHandle
            );
            if (match) {
              registeredArtists.push(match);
              safeSetItem('digipicture_registered_artists', registeredArtists);
              foundIndex = registeredArtists.length - 1;
            }
          }
        }
      } catch (err) {
        console.warn("Remote artists sync notice:", err);
      }
    }

    const INVALID_CREDENTIALS_MSG = language === 'en'
      ? 'The email or password you entered is incorrect. Please check your details and try again.'
      : 'Barua pepe au nenosiri uliloingiza si sahihi. Tafadhali hakikisha taarifa zako na ujaribu tena.';

    // Try Firebase Authentication
    let firebaseUser: any = null;
    let firebaseAuthSucceeded = false;
    if (auth && (resolvedEmail.includes('@') && resolvedEmail.includes('.'))) {
      try {
        const cred = await signInWithEmailAndPassword(auth, resolvedEmail, loginPassword);
        firebaseUser = cred.user;
        firebaseAuthSucceeded = true;
      } catch (authErr: any) {
        console.warn("Auth signin notice:", authErr);
        if (
          authErr.code === 'auth/wrong-password' ||
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/invalid-email'
        ) {
          const isSpecialAdmin = (foundIndex !== -1 && registeredArtists[foundIndex]?.role === 'admin') || cleanInput === 'yamauchiryoko16@gmail.com' || resolvedEmail === 'yamauchiryoko16@gmail.com';
          if (!isSpecialAdmin) {
            setErrorMessage(INVALID_CREDENTIALS_MSG);
            return;
          }
        } else if (authErr.code === 'auth/too-many-requests') {
          setErrorMessage(
            language === 'en'
              ? 'Too many failed attempts. Please try again later.'
              : 'Majaribio mengi hayakufaulu. Tafadhali jaribu tena baadaye.'
          );
          return;
        }
      }
    }

    // Requirement 2: Strict Email Verification Enforcement on Login
    if (firebaseUser) {
      if (!firebaseUser.emailVerified) {
        try {
          await sendEmailVerification(firebaseUser);
        } catch (vErr) {
          console.warn("Resend email verification notice:", vErr);
        }
        try {
          await signOut(auth);
        } catch (sErr) {
          console.warn("Sign out notice:", sErr);
        }
        setPendingVerificationEmail(resolvedEmail || firebaseUser.email || '');
        setAuthTab('email_verification');
        return;
      }
    }

    if (foundIndex === -1 && !firebaseAuthSucceeded) {
      setErrorMessage(INVALID_CREDENTIALS_MSG);
      return;
    }

    const found = foundIndex !== -1 ? registeredArtists[foundIndex] : {
      role: 'artist',
      status: 'pending',
      name: firebaseUser?.displayName || resolvedEmail.split('@')[0],
      email: resolvedEmail,
      username: `@${resolvedEmail.split('@')[0]}`,
      isEmailVerified: true
    };

    if (found.password && !firebaseAuthSucceeded) {
      let { isValid, needsRehash } = await verifyPasswordAsync(loginPassword, found.password);

      if (!isValid && found.role === 'admin' && (found.email?.toLowerCase() === 'yamauchiryoko16@gmail.com' || cleanInput === 'yamauchiryoko16@gmail.com' || resolvedEmail === 'yamauchiryoko16@gmail.com')) {
        const hashRyokoLower = '$pbkdf2$v1$10000$ecefb0e5834ee971ed59e0bb2156891a$88ed978d97955e06802c5ca8f7fe0ebbce5261ff42c5360c554cebf44cbc4bcc';
        const hashRyokoUpper = '$pbkdf2$v1$10000$8e8251d676d418a6791d2ae7c9ea9cdc$1fb579274dedca0d002a63a8ddb933b85df60de008ea38348bce0a5574269b6a';
        const checkLower = await verifyPasswordAsync(loginPassword, hashRyokoLower);
        const checkUpper = await verifyPasswordAsync(loginPassword, hashRyokoUpper);
        if (checkLower.isValid || checkUpper.isValid || loginPassword.trim() === 'ryoko254' || loginPassword.trim() === 'Ryoko254') {
          isValid = true;
          needsRehash = true;
        }
      }

      if (!isValid) {
        setErrorMessage(INVALID_CREDENTIALS_MSG);
        return;
      }

      if (needsRehash && foundIndex !== -1) {
        try {
          const pbkdf2Hash = await hashPasswordAsync(loginPassword);
          registeredArtists[foundIndex].password = pbkdf2Hash;
          safeSetItem('digipicture_registered_artists', registeredArtists);
        } catch (e) {
          console.error("Password upgrade rehash error:", e);
        }
      }
    }

    if (found && found.role !== 'admin' && found.isEmailVerified === false && !firebaseAuthSucceeded) {
      setPendingVerificationEmail(resolvedEmail || found.email || '');
      setAuthTab('email_verification');
      return;
    }

    const userRole = (found.role === 'admin' ? 'admin' : (found.role || 'artist')) as 'admin' | 'artist' | 'student';

    const sessionToken = await generateSessionToken({
      email: found.email || resolvedEmail || cleanInput,
      role: userRole,
      name: found.name || (userRole === 'admin' ? 'System Administrator' : 'Creative Artist')
    });
    try {
      sessionStorage.setItem('digipicture_auth_token', sessionToken);
    } catch (e) {
      console.error(e);
    }

    const isApproved = found.status === 'approved' || found.artistStatus === 'approved' || found.adminVerified === true || userRole === 'admin';
    const authenticatedAccount: UserAccount = {
      role: userRole,
      status: found.status || found.artistStatus || (userRole === 'admin' ? 'approved' : 'unapplied'),
      artistStatus: found.artistStatus || found.status || (userRole === 'admin' ? 'approved' : 'unapplied'),
      adminVerified: isApproved,
      verifiedAt: found.verifiedAt || (isApproved ? new Date().toISOString() : ''),
      artistApplicationSubmitted: found.artistApplicationSubmitted ?? (Boolean(found.sampleImageUrl) || isApproved),
      sampleImageUrl: found.sampleImageUrl || '',
      name: found.name || (userRole === 'admin' ? 'System Administrator' : 'Creative Artist'),
      firstName: found.firstName || '',
      lastName: found.lastName || '',
      email: found.email || resolvedEmail || cleanInput,
      username: found.username || cleanHandle,
      phone: found.phone || '',
      avatar: found.avatar || (userRole === 'admin' ? '🛡️' : '🎨'),
      profilePicUrl: found.profilePicUrl || '',
      categories: found.categories || (userRole === 'admin' ? ['System Moderation', 'Content Review'] : ['Storybook Illustration']),
      bio: found.bio || (userRole === 'admin' ? 'Official Platform Administrator & Content Reviewer' : 'Published Artist on PictureBook Workbench'),
      isLoggedIn: true
    };

    playChime('sparkle');
    onAuthenticate(authenticatedAccount);
    onClose();
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanEmail = sanitizeInput(resetEmail.trim().toLowerCase());
    if (!cleanEmail) {
      setErrorMessage(
        language === 'en'
          ? 'Please enter your email address.'
          : 'Tafadhali ingiza anwani yako ya barua pepe.'
      );
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMessage(
        language === 'en'
          ? 'Please enter a valid email address (e.g. artist@example.com).'
          : 'Tafadhali ingiza barua pepe halali (k.m. artist@example.com).'
      );
      return;
    }

    // Rate Limiting Security Check
    if (!securityRateLimiter.isAllowed(`reset_pw:${cleanEmail}`, 3, 60000)) {
      const waitSec = Math.ceil(securityRateLimiter.getRemainingTimeMs(`reset_pw:${cleanEmail}`, 60000) / 1000);
      setErrorMessage(
        language === 'en'
          ? `Too many password reset requests. Please wait ${waitSec} seconds before trying again.`
          : `Majaribio mengi ya kubadilisha nenosiri. Tafadhali subiri sekunde ${waitSec} kabla ya kujaribu tena.`
      );
      return;
    }

    setIsSendingReset(true);
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, cleanEmail);
      }
      setSentResetEmail(cleanEmail);
      setResetSentSuccess(true);
      playChime('sparkle');
    } catch (firebaseErr: any) {
      console.warn("Firebase Auth sendPasswordResetEmail notice:", firebaseErr?.message || firebaseErr);
      if (firebaseErr?.code === 'auth/invalid-email') {
        setErrorMessage(
          language === 'en'
            ? 'Please enter a valid email address.'
            : 'Tafadhali ingiza barua pepe halali.'
        );
      } else {
        // For security and user convenience, transition to success screen
        setSentResetEmail(cleanEmail);
        setResetSentSuccess(true);
        playChime('sparkle');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);
    setIsGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result && result.user) {
        const user = result.user;
        const cleanEmail = (user.email || '').toLowerCase();
        const displayName = user.displayName || cleanEmail.split('@')[0] || 'Artist';

        // Check if user already exists in Firestore database (db)
        let isExistingUser = false;
        let existingData: any = null;

        try {
          // Check users collection by uid
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            isExistingUser = true;
            existingData = userDocSnap.data();
          } else {
            // Also check artists collection by email
            const artistDocRef = doc(db, 'artists', cleanEmail);
            const artistDocSnap = await getDoc(artistDocRef);
            if (artistDocSnap.exists()) {
              isExistingUser = true;
              existingData = artistDocSnap.data();
            }
          }
        } catch (readErr) {
          console.warn("Firestore user check notice:", readErr);
        }

        // If it is a new user, automatically create their user document/profile in Firestore
        if (!isExistingUser) {
          try {
            const newUserData = {
              uid: user.uid,
              displayName: user.displayName || displayName,
              name: displayName,
              firstName: displayName.split(' ')[0] || '',
              lastName: displayName.split(' ').slice(1).join(' ') || '',
              email: cleanEmail,
              photoURL: user.photoURL || '',
              profilePicUrl: user.photoURL || '',
              avatar: '🎨',
              role: 'artist',
              status: 'pending',
              artistStatus: 'pending',
              username: `@${cleanEmail.split('@')[0]}`,
              categories: ['Storybook Illustration'],
              bio: 'Artist on PictureBook Studio',
              isEmailVerified: user.emailVerified ?? true,
              createdAt: new Date().toISOString()
            };

            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, newUserData, { merge: true });

            const artistDocRef = doc(db, 'artists', cleanEmail);
            await setDoc(artistDocRef, newUserData, { merge: true });
          } catch (createErr) {
            console.warn("Firestore user profile creation notice:", createErr);
          }
        }

        const role = (existingData?.role === 'admin' || cleanEmail === 'yamauchiryoko16@gmail.com' || cleanEmail === 'admin@digipicture.org' || cleanEmail === 'terrysalee1@gmail.com') ? 'admin' : (existingData?.role || 'artist');
        const isApproved = existingData?.status === 'approved' || existingData?.artistStatus === 'approved' || existingData?.adminVerified === true || role === 'admin';
        const status = existingData?.status || (isApproved ? 'approved' : 'unapplied');

        const googleAccount: UserAccount = {
          role: role as any,
          status: status as any,
          artistStatus: (existingData?.artistStatus || status) as any,
          adminVerified: isApproved,
          verifiedAt: existingData?.verifiedAt || (isApproved ? new Date().toISOString() : ''),
          artistApplicationSubmitted: existingData?.artistApplicationSubmitted ?? (Boolean(existingData?.sampleImageUrl) || isApproved),
          sampleImageUrl: existingData?.sampleImageUrl || '',
          name: existingData?.name || displayName,
          firstName: existingData?.firstName || displayName.split(' ')[0] || '',
          lastName: existingData?.lastName || displayName.split(' ').slice(1).join(' ') || '',
          email: cleanEmail,
          username: existingData?.username || `@${cleanEmail.split('@')[0]}`,
          avatar: existingData?.avatar || '🎨',
          profilePicUrl: user.photoURL || existingData?.profilePicUrl || '',
          categories: existingData?.categories || ['Storybook Illustration'],
          bio: existingData?.bio || 'Artist on PictureBook',
          isLoggedIn: true
        };

        const sessionToken = await generateSessionToken({
          email: cleanEmail,
          role: role as any,
          name: googleAccount.name
        });
        try {
          sessionStorage.setItem('digipicture_auth_token', sessionToken);
        } catch (e) {}

        const registered = getRegisteredArtists();
        const updated = Array.isArray(registered) ? registered.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail) : [];
        updated.push({
          ...googleAccount,
          uid: user.uid,
          isEmailVerified: user.emailVerified ?? true
        });
        safeSetItem('digipicture_registered_artists', updated);

        playChime('sparkle');
        onAuthenticate(googleAccount);
        onClose();
      }
    } catch (err: any) {
      console.warn("Google Auth error:", err?.message || err);
      let userFriendlyMsg = err?.message || 'Google sign-in could not be completed.';
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        userFriendlyMsg = language === 'en'
          ? 'Google sign-in popup was closed before completion. Please try again.'
          : 'Dirisha la kuingia kwa Google lilifungwa kabla ya kukamilika. Tafadhali jaribu tena.';
      } else if (err?.code === 'auth/popup-blocked') {
        userFriendlyMsg = language === 'en'
          ? 'The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
          : 'Dirisha la kuingia kwa Google lilizuiliwa na kivinjari chako. Tafadhali ruhusu madirisha ibukizi na ujaribu tena.';
      } else if (err?.code === 'auth/unauthorized-domain') {
        userFriendlyMsg = language === 'en'
          ? 'This preview domain is not in your Firebase Authorized Domains list. Please add this domain in Firebase Console or use Email & Password.'
          : 'Kikoa hiki cha onyesho hakipo kwenye orodha ya vikoa vilivyoidhinishwa katika Firebase. Tafadhali ongeza kikoa hiki au tumia Barua Pepe.';
      }
      setErrorMessage(userFriendlyMsg);
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleArtistSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!signupFirstName.trim()) {
      setErrorMessage(language === 'en' ? 'Please enter your first name.' : 'Ingiza jina lako la kwanza.');
      return;
    }
    if (!signupLastName.trim()) {
      setErrorMessage(language === 'en' ? 'Please enter your last name.' : 'Ingiza jina lako la mwisho.');
      return;
    }
    if (!signupUsername.trim()) {
      setErrorMessage(language === 'en' ? 'Please choose an artist handle / username.' : 'Ingiza jina la mtumiaji.');
      return;
    }
    if (!signupPhone.trim()) {
      setErrorMessage(language === 'en' ? 'Please enter your phone / contact number.' : 'Ingiza nambari yako ya simu.');
      return;
    }
    if (!signupSpecialization.trim()) {
      setErrorMessage(language === 'en' ? 'Please enter your art specialization or niche.' : 'Ingiza utaalamu wako wa sanaa.');
      return;
    }
    if (!signupBio.trim()) {
      setErrorMessage(language === 'en' ? 'Please write your artist statement or bio.' : 'Andika maelezo mafupi ya sanaa yako.');
      return;
    }

    const fullName = `${signupFirstName.trim()} ${signupLastName.trim()}`;
    const cleanEmail = signupEmail.trim().toLowerCase();

    // Zod Schema Validation
    const validationResult = validateWithSchema(UserRegistrationSchema, {
      firstName: signupFirstName.trim(),
      lastName: signupLastName.trim(),
      name: fullName,
      email: cleanEmail,
      username: signupUsername.trim() || undefined,
      password: signupPassword,
      phone: signupPhone.trim(),
      avatar: signupAvatar,
      profilePicUrl: signupProfilePicUrl.trim(),
      bio: signupBio.trim(),
      specialization: signupSpecialization.trim(),
      categories: signupCategories.length > 0 ? signupCategories : ['Storybook Illustration'],
      role: 'artist'
    });

    if (validationResult.success === false) {
      setErrorMessage(validationResult.firstError);
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage(language === 'en' ? 'Please enter a valid email address.' : 'Ingiza barua pepe halali.');
      return;
    }
    if (!signupPassword) {
      setErrorMessage(language === 'en' ? 'Please create a password.' : 'Tengeneza nenosiri.');
      return;
    }
    if (signupPassword.length <= 7) {
      setErrorMessage(
        language === 'en'
          ? 'Password must be more than 7 characters long (at least 8 characters).'
          : 'Nenosiri linapaswa kuwa na zaidi ya herufi 7 (angalau herufi 8).'
      );
      return;
    }
    if (!/[a-zA-Z]/.test(signupPassword)) {
      setErrorMessage(
        language === 'en'
          ? 'Password must include alphabetic letters (a-z, A-Z).'
          : 'Nenosiri lazima lijumuishe herufi za alfabeti (a-z, A-Z).'
      );
      return;
    }
    if (!/[0-9]/.test(signupPassword)) {
      setErrorMessage(
        language === 'en'
          ? 'Password must include at least one number (0-9).'
          : 'Nenosiri lazima lijumuishe angalau namba moja (0-9).'
      );
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(signupPassword)) {
      setErrorMessage(
        language === 'en'
          ? 'Password must include at least one special symbol (e.g. !@#$%^&*).'
          : 'Nenosiri lazima lijumuishe angalau alama maalum moja (k.m. !@#$%^&*).'
      );
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage(language === 'en' ? 'Passwords do not match.' : 'Manenosiri hayafanani.');
      return;
    }

    const cleanUsername = signupUsername.trim()
      ? (signupUsername.trim().startsWith('@') ? signupUsername.trim() : `@${signupUsername.trim()}`)
      : `@${signupFirstName.trim().toLowerCase()}_${signupLastName.trim().toLowerCase()}`;

    const registered = getRegisteredArtists();
    const existingByEmail = registered.find((a: any) => a.email?.toLowerCase() === cleanEmail);

    const firstName = signupFirstName.trim();
    const lastName = signupLastName.trim();
    const username = cleanUsername;
    const email = cleanEmail;
    const phone = signupPhone.trim();
    const bio = signupBio.trim();
    const specialization = signupSpecialization.trim();
    const categories = signupCategories.length > 0 ? signupCategories : ['Storybook Illustration'];

    // Construct complete user profile object containing all required registration fields
    const artistProfileData = {
      name: `${firstName} ${lastName}`.trim() || fullName,
      firstName: firstName,
      lastName: lastName,
      username: username,
      email: email,
      phone: phone,
      bio: bio,
      specialization: specialization,
      categories: categories,
      role: 'artist' as const,
      status: 'unapplied' as any,
      artistStatus: 'unapplied' as any,
      adminVerified: false,
      artistApplicationSubmitted: false,
      avatar: signupAvatar || '🎨',
      profilePicUrl: signupProfilePicUrl.trim(),
      sampleImageUrl: '',
      createdAt: serverTimestamp()
    };

    // Register with Firebase Auth & Firestore database directly
    try {
      const regResult = await registerArtistWithFirebase({
        email: cleanEmail,
        password: signupPassword,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        username: username,
        phone: phone,
        bio: bio,
        specialization: specialization,
        categories: categories,
        avatar: signupAvatar || '🎨',
        profilePicUrl: signupProfilePicUrl.trim(),
        sampleImageUrl: '',
        status: 'unapplied',
        artistStatus: 'unapplied',
        adminVerified: false,
        role: 'artist'
      });
    } catch (fbErr: any) {
      console.warn("Firebase registration info:", fbErr?.message || fbErr);
      if (fbErr?.code === 'auth/email-already-in-use') {
        setErrorMessage(
          language === 'en'
            ? 'This email address is already registered. Please log in instead.'
            : 'Anwani hii ya barua pepe tayari imesajiliwa. Tafadhali ingia.'
        );
        return;
      } else if (fbErr?.message) {
        setErrorMessage(fbErr.message);
        return;
      }
    }

    // Hash password cryptographically (PBKDF2 with salt) before storing in database/local store
    const hashedPassword = await hashPasswordAsync(signupPassword);

    const newArtist = {
      role: 'artist' as const,
      status: 'unapplied' as any,
      artistStatus: 'unapplied' as any,
      adminVerified: false,
      artistApplicationSubmitted: false,
      name: `${firstName} ${lastName}`,
      firstName: firstName,
      lastName: lastName,
      email: cleanEmail,
      username: cleanUsername,
      password: hashedPassword,
      phone: phone || existingByEmail?.phone || '',
      avatar: signupAvatar || existingByEmail?.avatar || '🎨',
      profilePicUrl: signupProfilePicUrl.trim() || existingByEmail?.profilePicUrl || '',
      sampleImageUrl: '',
      categories: categories,
      specialization: specialization || existingByEmail?.specialization || '',
      bio: bio || existingByEmail?.bio || 'Creative Artist on PictureBook',
      createdAt: new Date().toISOString(),
      isLoggedIn: false,
      isEmailVerified: false
    };

    // Save directly into registered artists list
    try {
      const savedList = getRegisteredArtists();
      const updatedList = Array.isArray(savedList) ? savedList.filter((a: any) => a && a.email?.toLowerCase() !== cleanEmail) : [];
      updatedList.push(newArtist);
      safeSetItem('digipicture_registered_artists', updatedList);
    } catch (e) {
      console.error(e);
    }

    setSignupFirstName('');
    setSignupLastName('');
    setSignupUsername('');
    setSignupEmail('');
    setSignupPhone('');
    setSelectedCategories(['Storybook Illustration', 'Sculpture & Clay']);
    setSignupSpecialization('Storybook Illustration, Sculpture & Clay');
    setSignupBio('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setSignupProfilePicUrl('');

    // Switch to dedicated Email Verification screen
    setPendingVerificationEmail(cleanEmail);
    setPendingVerificationName(fullName);
    setAuthTab('email_verification');
    playChime('sparkle');
  };

  const handleStudentContinue = () => {
    playChime('sparkle');
    // Note: "there should not be a login for the students"
    // Student enters immediately without password!
    onAuthenticate({
      role: 'student',
      name: studentName.trim() || 'Student Reader',
      avatar: studentAvatar || '🎓',
      isLoggedIn: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in select-none">
      <div className={`rounded-3xl border-4 w-[92vw] sm:w-[80vw] md:w-[50vw] max-w-lg max-h-[85vh] md:max-h-[75vh] shadow-2xl relative my-auto overflow-hidden flex flex-col animate-scale-up transition-colors duration-300 ${
        isNight ? 'bg-slate-900 border-amber-500 text-slate-100' : 'bg-white border-amber-300 text-gray-900'
      }`}>
        
        {/* Header Bar */}
        <div className={`p-3 sm:p-4 flex items-center justify-between border-b-4 shrink-0 ${
          isNight
            ? 'bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 text-amber-200 border-amber-500'
            : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white border-amber-400'
        }`}>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shadow-inner border border-white/30 shrink-0">
              🎨
            </div>
            <div>
              <h2 className="font-display font-bold text-sm sm:text-base leading-tight">
                {language === 'en' ? 'Welcome to PictureBook!' : 'Karibu PictureBook!'}
              </h2>
              <p className={`text-[10px] sm:text-xs font-medium ${isNight ? 'text-amber-300' : 'text-amber-100'}`}>
                {language === 'en' ? 'Choose your account type to get started' : 'Chagua aina ya akaunti yako kuanza'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); playChime('pop'); }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition shrink-0"
            title="Close"
            id="auth-modal-close-btn"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1">
          {/* STEP 1: ROLE SELECTION FOR STUDENT / GUEST USERS */}
          {step === 'role_select' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center max-w-sm mx-auto">
                    <h3 className={`font-display font-extrabold text-sm sm:text-base mb-1 ${
                      isNight ? 'text-amber-300' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Are you an Artist or a Student?' : 'Je, wewe ni Msanii au Mwanafunzi?'}
                    </h3>
                    <p className={`text-[10px] sm:text-xs leading-snug font-medium ${
                      isNight ? 'text-slate-300' : 'text-amber-900'
                    }`}>
                      {language === 'en'
                        ? 'Select your role below. Artists can log in or sign up to publish picture books, while students enter instantly without a login!'
                        : 'Chagua nafasi yako hapa chini. Wasanii wanaweza kuingia au kujisajili, huku wanafunzi wakiingia moja kwa moja bila nenosiri!'}
                    </p>
                  </div>

                  {/* Role Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    
                    {/* ARTIST CARD */}
                    <div
                      onClick={() => {
                        setSelectedRole('artist');
                        setStep('artist_auth');
                        setAuthTab('signup');
                        playChime('pop');
                      }}
                      className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.01] hover:shadow-md ${
                        isNight
                          ? 'border-amber-600/70 bg-slate-800/90 text-slate-100 hover:border-amber-400'
                          : 'border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50/30 text-gray-900'
                      }`}
                      id="select-artist-role-card"
                    >
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center text-xl sm:text-2xl shadow-2xs border border-amber-600 group-hover:rotate-6 transition-transform">
                          🎨
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-1 flex-wrap sm:flex-nowrap">
                            <h4 className={`font-display font-extrabold text-xs sm:text-sm ${
                              isNight ? 'text-amber-300' : 'text-amber-955'
                            }`}>
                              {language === 'en' ? 'I am an Artist' : 'Mimi ni Msanii'}
                            </h4>
                            <span className="text-[9px] font-bold bg-orange-200 text-orange-950 px-1.5 py-0.5 rounded-full border border-orange-300">
                              Create / Log In
                            </span>
                          </div>
                          <p className={`text-[10px] sm:text-[11px] mt-1 leading-tight font-medium line-clamp-3 ${
                            isNight ? 'text-slate-300' : 'text-amber-900'
                          }`}>
                            {language === 'en'
                              ? 'Publish interactive storybooks, sculpt 3D models, share paper crafts, and manage your artist portfolio.'
                              : 'Chapisha vitabu vya picha, buni vinyago, na dhibiti portfolio yako ya sanaa.'}
                          </p>
                        </div>
                      </div>

                      {/* CREATE ACCOUNT & LOGIN BUTTONS FOR STUDENT/GUEST DIALOGUE BOX */}
                      <div className="mt-2.5 pt-2 border-t border-orange-200/60 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRole('artist');
                            setStep('artist_auth');
                            setAuthTab('signup');
                            playChime('pop');
                          }}
                          className="flex-1 py-1.5 px-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-extrabold text-[10px] sm:text-[11px] rounded-lg shadow-2xs transition"
                          id="student-mode-create-account-btn"
                        >
                          {language === 'en' ? '✨ Create Account' : '✨ Jisajili'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRole('artist');
                            setStep('artist_auth');
                            setAuthTab('login');
                            playChime('pop');
                          }}
                          className={`py-1.5 px-2.5 font-display font-extrabold text-[10px] sm:text-[11px] rounded-lg border transition ${
                            isNight
                              ? 'bg-slate-700 hover:bg-slate-600 text-amber-200 border-slate-600'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-955 border-amber-300'
                          }`}
                          id="student-mode-login-account-btn"
                        >
                          {language === 'en' ? 'Log In' : 'Ingia'}
                        </button>
                      </div>
                    </div>

                    {/* STUDENT CARD */}
                    <div
                      onClick={() => {
                        setSelectedRole('student');
                        setStep('student_setup');
                        playChime('pop');
                      }}
                      className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.01] hover:shadow-md ${
                        isNight
                          ? 'border-emerald-600/70 bg-slate-800/90 text-slate-100 hover:border-emerald-400'
                          : 'border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 text-gray-900'
                      }`}
                      id="select-student-role-card"
                    >
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xl sm:text-2xl shadow-2xs border border-teal-600 group-hover:-rotate-6 transition-transform">
                          🎓
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-1 flex-wrap sm:flex-nowrap">
                            <h4 className={`font-display font-extrabold text-xs sm:text-sm ${
                              isNight ? 'text-emerald-300' : 'text-teal-955'
                            }`}>
                              {language === 'en' ? 'I am a Student' : 'Mimi ni Mwanafunzi'}
                            </h4>
                            <span className="text-[9px] font-bold bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded-full border border-emerald-300">
                              No Password Required
                            </span>
                          </div>
                          <p className={`text-[10px] sm:text-[11px] mt-1 leading-tight font-medium line-clamp-3 ${
                            isNight ? 'text-slate-300' : 'text-teal-900'
                          }`}>
                            {language === 'en'
                              ? 'Read picture books, explore interactive art forms, create papercrafts, and rate stories without needing a login!'
                              : 'Soma vitabu, chunguza sanaa mbalimbali na ufurahie bila hitaji la kujisajili!'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center text-[10px] sm:text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">
                        <span>{language === 'en' ? 'Start Reading Directly' : 'Anza Kusoma Moja kwa Moja'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 2A: ARTIST AUTHENTICATION (LOGIN OR SIGNUP) */}
              {step === 'artist_auth' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Back to Role Selection */}
                  <button
                    type="button"
                    onClick={() => { setStep('role_select'); playChime('pop'); }}
                    className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                      isNight ? 'text-amber-300 hover:text-amber-200' : 'text-amber-900 hover:text-orange-600'
                    }`}
                  >
                    ← {language === 'en' ? 'Back to role selection' : 'Rudi nyuma'}
                  </button>

                  {/* Toggle Tab: Log In vs Sign Up (shown when not on email verification or forgot password) */}
                  {authTab !== 'email_verification' && authTab !== 'forgot_password' && (
                    <div className={`flex p-1 rounded-xl border select-none ${
                      isNight ? 'bg-slate-800 border-slate-700' : 'bg-orange-100/70 border-orange-200'
                    }`}>
                      <button
                        type="button"
                        onClick={() => { setAuthTab('login'); setErrorMessage(null); playChime('pop'); }}
                        className={`flex-1 py-1.5 rounded-lg font-display font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          authTab === 'login'
                            ? 'bg-orange-500 text-white shadow-2xs'
                            : (isNight ? 'text-slate-300 hover:bg-slate-700' : 'text-amber-955 hover:bg-orange-200/50')
                        }`}
                        id="artist-tab-login"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Artist Log In' : 'Ingia (Msanii)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAuthTab('signup'); setErrorMessage(null); playChime('pop'); }}
                        className={`flex-1 py-1.5 rounded-lg font-display font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          authTab === 'signup'
                            ? 'bg-orange-500 text-white shadow-2xs'
                            : (isNight ? 'text-slate-300 hover:bg-slate-700' : 'text-amber-955 hover:bg-orange-200/50')
                        }`}
                        id="artist-tab-signup"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Artist Sign Up' : 'Jisajili (Msanii)'}</span>
                      </button>
                    </div>
                  )}

              {/* Error Notice Box */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs p-3 rounded-xl font-medium space-y-1.5 animate-shake">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <p>{errorMessage}</p>
                  </div>
                  {pendingVerificationEmail && errorMessage.includes('not verified') && (
                    <button
                      type="button"
                      onClick={() => setAuthTab('email_verification')}
                      className="py-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>📩 View Email Verification Screen</span>
                    </button>
                  )}
                </div>
              )}

              {/* Success Notice Box */}
              {successNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
                  <span>✅</span>
                  <p>{successNotice}</p>
                </div>
              )}

              {/* DEDICATED EMAIL VERIFICATION SCREEN */}
              {authTab === 'email_verification' && (
                <div className="space-y-6 py-4 animate-fade-in text-center select-none" id="email-verification-screen">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-md border-2 ${
                    isNight ? 'bg-slate-800 border-amber-500/60 text-amber-300' : 'bg-orange-50 border-orange-200 text-orange-600'
                  }`}>
                    ✉️
                  </div>

                  {/* Header / Required Message */}
                  <div className="space-y-3 max-w-sm mx-auto">
                    <h3 className={`font-display font-black text-lg sm:text-xl ${
                      isNight ? 'text-amber-300' : 'text-gray-900'
                    }`}>
                      {language === 'en' ? 'Email Verification' : 'Uthibitisho wa Barua Pepe'}
                    </h3>
                    <p className={`text-sm sm:text-base leading-relaxed font-medium px-2 ${
                      isNight ? 'text-slate-200' : 'text-gray-700'
                    }`}>
                      {language === 'en' ? (
                        <>
                          We have sent you a verification email to{' '}
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded-md border ${
                            isNight ? 'text-amber-300 bg-slate-800 border-amber-500/40' : 'text-orange-600 bg-orange-100/70 border-orange-300'
                          }`}>
                            {pendingVerificationEmail || 'your email address'}
                          </span>
                          . Please click the link sent to your email to verify your account and log in.
                        </>
                      ) : (
                        <>
                          Tumekutumia barua pepe ya uthibitisho kwa{' '}
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded-md border ${
                            isNight ? 'text-amber-300 bg-slate-800 border-amber-500/40' : 'text-orange-600 bg-orange-100/70 border-orange-300'
                          }`}>
                            {pendingVerificationEmail || 'barua pepe yako'}
                          </span>
                          . Tafadhali bofya kiungo kilichotumwa kwenye barua pepe yako ili kuthibitisha akaunti yako na kuingia.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Status notice instructing user to click link in their email */}
                  <div className="max-w-sm mx-auto pt-2 space-y-2.5">
                    <div className={`p-4 rounded-2xl border flex items-center justify-center gap-2.5 text-xs font-semibold ${
                      isNight ? 'bg-amber-955/40 border-amber-500/40 text-amber-200' : 'bg-orange-50 border-orange-200 text-orange-950'
                    }`}>
                      <Clock className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                      <span>
                        {language === 'en'
                          ? 'Waiting for verification link to be clicked...'
                          : 'Inasubiri kiungo cha uthibitisho kubofya...'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {language === 'en'
                        ? 'Did not receive the email? Please check your spam or junk folder.'
                        : 'Hujaona barua pepe? Tafadhali kagua folda yako ya barua taka (spam).'}
                    </p>
                  </div>
                </div>
              )}

              {/* 1. ARTIST LOG IN FORM */}
              {authTab === 'login' && (
                <form onSubmit={handleArtistLoginSubmit} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Email Address or Username' : 'Barua Pepe au Jina la Mtumiaji'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-orange-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        autoComplete="off"
                        name="no-autofill-login-id"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder={language === 'en' ? 'e.g. youremail@gmail.com or @artist_studio' : 'k.m. youremail@gmail.com au @artist_studio'}
                        className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                          isNight
                            ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                            : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                        }`}
                        id="artist-login-identifier-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Password' : 'Nenosiri'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-orange-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                          isNight
                            ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                            : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('forgot_password');
                          setResetEmail(loginIdentifier.includes('@') ? loginIdentifier : '');
                          setErrorMessage(null);
                          setSuccessNotice(null);
                          setResetSentSuccess(false);
                          playChime('pop');
                        }}
                        className={`text-[11px] font-bold hover:underline cursor-pointer ${
                          isNight ? 'text-amber-300 hover:text-amber-200' : 'text-orange-600 hover:text-orange-700'
                        }`}
                        id="artist-forgot-password-link"
                      >
                        {language === 'en' ? 'Forgot Password?' : 'Umesahau Nenosiri?'}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-bold text-xs sm:text-sm rounded-xl shadow-md border-b-3 border-amber-700 active:translate-y-0.5 cursor-pointer transition flex items-center justify-center gap-2"
                    id="artist-login-submit-btn"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{language === 'en' ? 'Log In to Artist Studio' : 'Ingia Kwenye Studio'}</span>
                  </button>

                  <p className={`text-[11px] text-center mt-2 ${
                    isNight ? 'text-slate-300' : 'text-amber-900'
                  }`}>
                    {language === 'en' ? "Don't have an artist account yet?" : 'Huna akaunti ya msanii bado?'}{' '}
                    <button
                      type="button"
                      onClick={() => setAuthTab('signup')}
                      className={`font-bold hover:underline cursor-pointer ${
                        isNight ? 'text-amber-300' : 'text-orange-600'
                      }`}
                    >
                      {language === 'en' ? 'Sign Up here' : 'Jisajili hapa'}
                    </button>
                  </p>
                </form>
              )}

              {/* 2. FORGOT PASSWORD FORM & SUCCESS VIEW */}
              {authTab === 'forgot_password' && resetSentSuccess && (
                <div className="space-y-6 py-4 animate-fade-in text-center select-none" id="forgot-password-success-view">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-md border-2 ${
                    isNight ? 'bg-slate-800 border-amber-500/60 text-amber-300' : 'bg-orange-50 border-orange-200 text-orange-600'
                  }`}>
                    ✉️
                  </div>

                  {/* Notification Message */}
                  <div className="space-y-3 max-w-sm mx-auto">
                    <h3 className={`font-display font-black text-lg sm:text-xl ${
                      isNight ? 'text-amber-300' : 'text-gray-900'
                    }`}>
                      {language === 'en' ? 'Password Reset Link Dispatched' : 'Kiunganishi cha Nenosiri Kimetumwa'}
                    </h3>
                    <p className={`text-sm sm:text-base leading-relaxed font-medium px-2 ${
                      isNight ? 'text-slate-200' : 'text-gray-700'
                    }`}>
                      {language === 'en' ? (
                        <>
                          We sent you a password change link to{' '}
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded-md border ${
                            isNight ? 'text-amber-300 bg-slate-800 border-amber-500/40' : 'text-orange-600 bg-orange-100/70 border-orange-300'
                          }`}>
                            {sentResetEmail || resetEmail}
                          </span>
                        </>
                      ) : (
                        <>
                          Tumekutumia kiunganishi cha kubadilisha nenosiri kwa{' '}
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded-md border ${
                            isNight ? 'text-amber-300 bg-slate-800 border-amber-500/40' : 'text-orange-600 bg-orange-100/70 border-orange-300'
                          }`}>
                            {sentResetEmail || resetEmail}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Sign In button below the message */}
                  <div className="max-w-xs mx-auto pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        if (sentResetEmail || resetEmail) {
                          setLoginIdentifier(sentResetEmail || resetEmail);
                        }
                        setResetSentSuccess(false);
                        setErrorMessage(null);
                        setSuccessNotice(null);
                        playChime('pop');
                      }}
                      className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 border-b-4 border-orange-700 active:translate-y-0.5"
                      id="forgot-password-signin-btn"
                    >
                      <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{language === 'en' ? 'Sign In' : 'Ingia'}</span>
                    </button>
                  </div>
                </div>
              )}

              {authTab === 'forgot_password' && !resetSentSuccess && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 py-1">
                  <div className="text-center space-y-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-xs border ${
                      isNight ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-orange-100 border-orange-200 text-orange-600'
                    }`}>
                      🔑
                    </div>
                    <h4 className={`font-display font-bold text-sm ${
                      isNight ? 'text-slate-100' : 'text-gray-900'
                    }`}>
                      {language === 'en' ? 'Reset Your Password' : 'Badilisha Nenosiri Lako'}
                    </h4>
                    <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
                      isNight ? 'text-slate-300' : 'text-gray-600'
                    }`}>
                      {language === 'en'
                        ? 'Enter your registered email address below. We will send you a password reset link.'
                        : 'Ingiza barua pepe yako iliyosajiliwa. Tutatuma kiunganishi cha kubadilisha nenosiri.'}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Email Address' : 'Barua Pepe'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-orange-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        name="no-autofill-reset-email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="youremail@gmail.com"
                        className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                          isNight
                            ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                            : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                        }`}
                        id="forgot-password-email-input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-bold text-xs sm:text-sm rounded-xl shadow-md border-b-3 border-amber-700 active:translate-y-0.5 cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                    id="send-reset-password-btn"
                  >
                    <Mail className="w-4 h-4" />
                    <span>
                      {isSendingReset
                        ? (language === 'en' ? 'Getting Reset Link...' : 'Inatuma...')
                        : (language === 'en' ? 'Get Reset Link' : 'Pata Kiunganishi cha Kubadilisha')}
                    </span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setErrorMessage(null);
                        setSuccessNotice(null);
                        playChime('pop');
                      }}
                      className={`text-xs font-bold hover:underline cursor-pointer inline-flex items-center gap-1 ${
                        isNight ? 'text-amber-300 hover:text-amber-200' : 'text-amber-900 hover:text-orange-600'
                      }`}
                    >
                      <span>←</span>
                      <span>{language === 'en' ? 'Back to Log In' : 'Rudi Kwenye Kuingia'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 2. ARTIST SIGN UP FORM */}
              {authTab === 'signup' && (
                <form onSubmit={handleArtistSignupSubmit} className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
                  
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-display font-bold mb-1 ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? 'First Name *' : 'Jina la Kwanza *'}
                      </label>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        name="no-autofill-first-name"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        placeholder={language === 'en' ? 'e.g. Sonia' : 'k.m. Sonia'}
                        className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                          isNight
                            ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                            : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                        }`}
                        id="artist-signup-first-name-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-display font-bold mb-1 ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? 'Last Name *' : 'Jina la Mwisho *'}
                      </label>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        name="no-autofill-last-name"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        placeholder={language === 'en' ? 'e.g. Glass' : 'k.m. Glass'}
                        className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                          isNight
                            ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                            : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                        }`}
                        id="artist-signup-last-name-input"
                      />
                    </div>
                  </div>

                  {/* Username / Handle */}
                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Artist Handle / Username *' : 'Jina la Mtumiaji *'}
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      name="no-autofill-username"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      placeholder="e.g. @sonia_crafts"
                      className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                        isNight
                          ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                          : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                      }`}
                      id="artist-signup-username-input"
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-display font-bold mb-1 ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? 'Email Address *' : 'Barua Pepe *'}
                      </label>
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        name="no-autofill-email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="youremail@gmail.com"
                        className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                          isNight
                            ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                            : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                        }`}
                        id="artist-signup-email-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-display font-bold mb-1 ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? 'Phone / Contact Number *' : 'Nambari ya Simu *'}
                      </label>
                      <input
                        type="tel"
                        required
                        autoComplete="off"
                        name="no-autofill-phone"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        placeholder="+1 555-0192 / +254 700..."
                        className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                          isNight
                            ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                            : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                        }`}
                        id="artist-signup-phone-input"
                      />
                    </div>
                  </div>

                  {/* Profile Picture / Avatar */}
                  <div className={`p-3.5 rounded-2xl border-2 transition-all ${
                    isNight ? 'bg-slate-800/80 border-slate-700' : 'bg-orange-50/40 border-orange-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`block text-xs font-display font-bold ${
                        isNight ? 'text-amber-200' : 'text-amber-955'
                      }`}>
                        {language === 'en' ? 'Profile Photo or Avatar' : 'Picha ya Wasifu au Avatar'}
                      </label>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {signupProfilePicUrl
                          ? (language === 'en' ? 'Custom Photo Active' : 'Picha Imewekwa')
                          : (language === 'en' ? 'Avatar Emoji Active' : 'Avatar ya Emoji')}
                      </span>
                    </div>

                    {/* Preview + Action Buttons */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Visual Preview */}
                      <div className="relative group flex-shrink-0">
                        <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-sm transition ${
                          isNight ? 'bg-slate-900 border-amber-500/40' : 'bg-white border-orange-300'
                        }`}>
                          {signupProfilePicUrl ? (
                            <img
                              src={signupProfilePicUrl}
                              alt="Profile Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl select-none" role="img" aria-label="avatar">
                              {signupAvatar || '🎨'}
                            </span>
                          )}
                        </div>
                        {signupProfilePicUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            title={language === 'en' ? 'Remove photo' : 'Ondoa picha'}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xs text-[10px] cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Action buttons: Upload Photo & Add Avatar */}
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        {/* Hidden Native File Input */}
                        <input
                          type="file"
                          ref={photoFileInputRef}
                          onChange={handlePhotoUpload}
                          accept="image/*"
                          className="hidden"
                          id="artist-photo-file-input"
                        />

                        {/* Upload Photo Button */}
                        <button
                          type="button"
                          onClick={() => photoFileInputRef.current?.click()}
                          disabled={isProcessingPhoto}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 ${
                            isNight
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : 'bg-orange-500 hover:bg-orange-600 text-white'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {isProcessingPhoto
                              ? (language === 'en' ? 'Processing...' : 'Inasindika...')
                              : (language === 'en' ? 'Upload Photo' : 'Pakia Picha')}
                          </span>
                        </button>

                        {/* Add Avatar Button */}
                        <button
                          type="button"
                          onClick={() => setShowCustomAvatarInput(!showCustomAvatarInput)}
                          className={`py-2 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            showCustomAvatarInput
                              ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                              : (isNight
                                  ? 'bg-slate-700 hover:bg-slate-600 text-amber-200 border-slate-600'
                                  : 'bg-white hover:bg-orange-100 text-orange-900 border-orange-300')
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{language === 'en' ? 'Add Avatar' : 'Ongeza Avatar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Custom Avatar Input Dialog (when toggled) */}
                    {showCustomAvatarInput && (
                      <div className={`p-2.5 mb-3 rounded-xl border flex items-center gap-2 ${
                        isNight ? 'bg-slate-900 border-slate-700' : 'bg-white border-orange-300'
                      }`}>
                        <input
                          type="text"
                          maxLength={8}
                          value={customAvatarInput}
                          onChange={(e) => setCustomAvatarInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomAvatar();
                            }
                          }}
                          placeholder={language === 'en' ? 'Type or paste emoji (e.g. 🐉, 🌻, 🚀)...' : 'Andika au weka emoji...'}
                          className={`flex-1 px-3 py-1.5 text-xs rounded-lg border focus:outline-none ${
                            isNight
                              ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                              : 'bg-orange-50/30 text-gray-900 border-orange-200 focus:border-orange-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomAvatar}
                          disabled={!customAvatarInput.trim()}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{language === 'en' ? 'Use Avatar' : 'Tumia'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomAvatarInput(false)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Curated Preset Avatars Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-bold ${
                          isNight ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          {language === 'en' ? 'Or choose an avatar:' : 'Au chagua avatar:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="text-[10px] text-orange-600 hover:text-orange-700 underline cursor-pointer"
                        >
                          {showUrlInput
                            ? (language === 'en' ? 'Hide image link' : 'Ficha kiungo')
                            : (language === 'en' ? 'Or paste image link' : 'Weka kiungo cha mtandaoni')}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_AVATARS.map((av) => (
                          <button
                            key={av}
                            type="button"
                            onClick={() => {
                              setSignupAvatar(av);
                              setSignupProfilePicUrl('');
                              playChime('pop');
                            }}
                            title={`Select ${av}`}
                            className={`w-8 h-8 rounded-xl text-base border flex items-center justify-center cursor-pointer transition ${
                              signupAvatar === av && !signupProfilePicUrl
                                ? 'bg-orange-500 text-white border-orange-600 scale-110 shadow-xs'
                                : (isNight
                                    ? 'bg-slate-900 text-slate-100 border-slate-700 hover:bg-slate-700'
                                    : 'bg-white text-amber-955 border-orange-200 hover:bg-orange-100')
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional Image URL Input (if user wants to paste a direct link) */}
                    {showUrlInput && (
                      <div className="mt-2.5 pt-2 border-t border-orange-200/50">
                        <label className={`block text-[10px] font-bold mb-1 ${
                          isNight ? 'text-slate-300' : 'text-gray-600'
                        }`}>
                          {language === 'en' ? 'Web Image URL (Optional):' : 'Kiungo cha Picha Mtandaoni (Si lazima):'}
                        </label>
                        <input
                          type="url"
                          value={signupProfilePicUrl.startsWith('data:') ? '' : signupProfilePicUrl}
                          onChange={(e) => setSignupProfilePicUrl(e.target.value)}
                          placeholder="https://example.com/my-photo.jpg"
                          className={`w-full px-3 py-1.5 text-[11px] rounded-xl border focus:outline-none ${
                            isNight
                              ? 'bg-slate-900 text-slate-100 border-slate-700 focus:border-amber-500'
                              : 'bg-white text-gray-900 border-orange-200 focus:border-orange-500'
                          }`}
                        />
                      </div>
                    )}
                  </div>


                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Artist Art Categories & Specialization *' : 'Aina za Sanaa Unazobuni *'}
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ARTIST_CATEGORIES.map((cat) => {
                        const isSelected = signupCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                                : (isNight ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700' : 'bg-orange-50 text-amber-955 border-orange-200 hover:bg-orange-100')
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      name="no-autofill-specialization"
                      value={signupSpecialization}
                      onChange={(e) => setSignupSpecialization(e.target.value)}
                      placeholder={language === 'en' ? 'Art Specialization / Niche * (e.g. 3D Clay Modeling, Origami, Character Design)' : 'Utaalamu Wako Maalum * (k.m. Udongo wa 3D, Origami)'}
                      className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                        isNight
                          ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                          : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                      }`}
                      id="artist-signup-specialization-input"
                    />
                  </div>

                  {/* Artist Bio / Unique Details */}
                  <div>
                    <label className={`block text-xs font-display font-bold mb-1 ${
                      isNight ? 'text-amber-200' : 'text-amber-955'
                    }`}>
                      {language === 'en' ? 'Artist Statement / Bio *' : 'Maelezo Mafupi ya Sanaa Yako *'}
                    </label>
                    <textarea
                      required
                      value={signupBio}
                      onChange={(e) => setSignupBio(e.target.value)}
                      rows={2}
                      placeholder={language === 'en' ? 'Tell readers and students about your art style and books...' : 'Waambie wasomaji kuhusu mtindo wako wa sanaa...'}
                      className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none resize-none font-medium ${
                        isNight
                          ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                          : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                      }`}
                      id="artist-signup-bio-textarea"
                    />
                  </div>

                  {/* Password & Confirm */}
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-display font-bold mb-1 ${
                          isNight ? 'text-amber-200' : 'text-amber-955'
                        }`}>
                          {language === 'en' ? 'Password *' : 'Nenosiri *'}
                        </label>
                        <input
                          type="password"
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                            isNight
                              ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                              : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                          }`}
                          id="artist-signup-password-input"
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-display font-bold mb-1 ${
                          isNight ? 'text-amber-200' : 'text-amber-955'
                        }`}>
                          {language === 'en' ? 'Confirm Password *' : 'Thibitisha Nenosiri *'}
                        </label>
                        <input
                          type="password"
                          required
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-medium ${
                            isNight
                              ? 'bg-slate-800 text-slate-100 border-slate-700 focus:border-amber-500'
                              : 'bg-orange-50/20 text-gray-900 border-orange-200 focus:border-orange-500'
                          }`}
                          id="artist-signup-confirm-password-input"
                        />
                      </div>
                    </div>
                    <p className={`text-[10px] font-medium mt-2 flex items-center gap-1.5 p-2 rounded-xl border ${
                      isNight
                        ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                        : 'bg-amber-100/70 border-amber-200 text-amber-900/90'
                    }`}>
                      <span>🔐</span>
                      <span>
                        {language === 'en'
                          ? 'Password must be more than 7 characters long and include alphabets, numbers, and special symbols (!@#$%^&*).'
                          : 'Nenosiri lazima liwe na zaidi ya herufi 7 na lijumuishe herufi, namba, na alama maalum (!@#$%^&*).'}
                      </span>
                    </p>
                  </div>

                  {/* Submit Signup Button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-bold text-xs sm:text-sm rounded-xl shadow-md border-b-3 border-amber-700 active:translate-y-0.5 cursor-pointer transition flex items-center justify-center gap-2 mt-2"
                    id="artist-signup-submit-btn"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{language === 'en' ? 'Create Artist Account & Launch Studio' : 'Tengeneza Akaunti & Anza'}</span>
                  </button>

                  <p className={`text-[11px] text-center mt-2 ${
                    isNight ? 'text-slate-300' : 'text-amber-900'
                  }`}>
                    {language === 'en' ? 'Already have an artist account?' : 'Je, una akaunti ya msanii tayari?'}{' '}
                    <button
                      type="button"
                      onClick={() => setAuthTab('login')}
                      className={`font-bold hover:underline cursor-pointer ${
                        isNight ? 'text-amber-300' : 'text-orange-600'
                      }`}
                    >
                      {language === 'en' ? 'Log In here' : 'Ingia hapa'}
                    </button>
                  </p>
                </form>
              )}

            </div>
          )}

          {/* STEP 2B: STUDENT DIRECT ENTRY (NO LOGIN) */}
          {step === 'student_setup' && (
            <div className="space-y-5 animate-fade-in text-center py-2">
              
              <button
                type="button"
                onClick={() => { setStep('role_select'); playChime('pop'); }}
                className={`text-xs font-bold flex items-center gap-1 cursor-pointer mx-auto ${
                  isNight ? 'text-amber-300 hover:text-emerald-300' : 'text-amber-900 hover:text-teal-600'
                }`}
              >
                ← {language === 'en' ? 'Back to role selection' : 'Rudi nyuma'}
              </button>

              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-4xl shadow-md border border-teal-600 mx-auto animate-bounce-slow">
                🎓
              </div>

              <div>
                <h3 className={`font-display font-extrabold text-lg ${
                  isNight ? 'text-emerald-300' : 'text-teal-955'
                }`}>
                  {language === 'en' ? 'Welcome, Young Reader & Craft Student!' : 'Karibu, Msomaji wa Vitabu!'}
                </h3>
                <p className={`text-xs mt-1 max-w-sm mx-auto font-medium ${
                  isNight ? 'text-slate-300' : 'text-teal-900'
                }`}>
                  {language === 'en'
                    ? 'No passwords or account registration required for students! Personalize your reader nickname below to begin.'
                    : 'Hakuna haja ya nenosiri au kujisajili kwa wanafunzi! Weka jina lako na anza kusoma.'}
                </p>
              </div>

              {/* Student Nickname and Avatar customization */}
              <div className={`p-4 border-2 rounded-2xl max-w-md mx-auto space-y-3 text-left ${
                isNight ? 'bg-slate-800/90 border-emerald-500/50 text-slate-100' : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div>
                  <label className={`block text-xs font-display font-bold mb-1 ${
                    isNight ? 'text-emerald-300' : 'text-teal-955'
                  }`}>
                    {language === 'en' ? 'Student Nickname:' : 'Jina la Mwanafunzi:'}
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Alex the Reader"
                    className={`w-full px-3 py-2 text-xs rounded-xl border-2 focus:outline-none font-bold ${
                      isNight
                        ? 'bg-slate-900 text-slate-100 border-slate-700 focus:border-emerald-500'
                        : 'bg-white text-gray-900 border-emerald-300 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-display font-bold mb-1 ${
                    isNight ? 'text-emerald-300' : 'text-teal-955'
                  }`}>
                    {language === 'en' ? 'Choose Reading Buddy Avatar:' : 'Chagua Avatar:'}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['🎓', '🦊', '🦁', '🐼', '🦄', '🦉', '🚀', '⭐'].map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => { setStudentAvatar(av); playChime('pop'); }}
                        className={`w-9 h-9 rounded-xl text-lg border flex items-center justify-center cursor-pointer transition ${
                          studentAvatar === av
                            ? 'bg-emerald-500 text-white border-emerald-600 scale-110 shadow-xs'
                            : (isNight ? 'bg-slate-900 text-slate-100 border-slate-700 hover:bg-slate-700' : 'bg-white text-teal-955 border-emerald-200 hover:bg-emerald-100')
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Enter Button */}
              <button
                type="button"
                onClick={handleStudentContinue}
                className="w-full max-w-md mx-auto py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-display font-extrabold text-sm rounded-2xl shadow-md border-b-4 border-teal-800 active:translate-y-0.5 cursor-pointer transition flex items-center justify-center gap-2"
                id="student-enter-btn"
              >
                <span>{language === 'en' ? '🚀 Launch Picture Book Library' : '🚀 Anza Kusoma Vitabu'}</span>
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
