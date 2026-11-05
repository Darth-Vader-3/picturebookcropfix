import React, { useState, useEffect } from 'react';
import { Send, Mail, User, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DirectMessage } from '../types';

export interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  bookTitle?: string;
  theme?: 'day' | 'night';
  language?: 'en' | 'sw';
  currentUser?: any;
  userAccount?: any;
  userProfile?: { name: string; email: string; avatar?: string };
  onMessageSent?: (msg: DirectMessage) => void;
  playChime?: (sound: 'sparkle' | 'bubble' | 'wood' | 'clay' | 'pop') => void;
  setDbNotification?: (notif: { type: 'success' | 'error' | 'info'; message: string }) => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  isOpen,
  onClose,
  artistName,
  bookTitle,
  theme = 'day',
  language = 'en',
  currentUser,
  userAccount,
  userProfile,
  onMessageSent,
  playChime,
  setDbNotification
}) => {
  const [senderName, setSenderName] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [senderRole, setSenderRole] = useState<string>('Student');
  const [messageText, setMessageText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-Populate or Require Input based on login status
  useEffect(() => {
    if (!isOpen) return;

    const activeAuth = auth.currentUser;
    const isAuthLoggedIn = Boolean(
      (activeAuth && activeAuth.email) ||
      (currentUser && currentUser.email) ||
      (userAccount && userAccount.isLoggedIn && userAccount.email)
    );

    if (isAuthLoggedIn) {
      // Auto-fill both 'Your Name' and 'Your Email Address' fields from their account profile
      const resolvedName =
        activeAuth?.displayName ||
        currentUser?.displayName ||
        userAccount?.name ||
        userProfile?.name ||
        '';

      const resolvedEmail =
        activeAuth?.email ||
        currentUser?.email ||
        userAccount?.email ||
        userProfile?.email ||
        '';

      setSenderName(resolvedName);
      setSenderEmail(resolvedEmail);
    } else {
      // Guest or not logged in: require them to manually type both their name and valid email address
      setSenderName('');
      setSenderEmail('');
    }

    setSenderRole('Student');
    setMessageText('');
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [isOpen, currentUser, userAccount, userProfile]);

  if (!isOpen) return null;

  const activeAuth = auth.currentUser;
  const isUserLoggedIn = Boolean(
    (activeAuth && activeAuth.email) ||
    (currentUser && currentUser.email) ||
    (userAccount && userAccount.isLoggedIn && userAccount.email)
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = senderName.trim();
    const trimmedEmail = senderEmail.trim();
    const trimmedText = messageText.trim();

    // Validation Check: verify that senderName.trim(), senderEmail.trim(), and messageText.trim() are all non-empty before sending
    if (!trimmedName || !trimmedEmail || !trimmedText) {
      let missingDetail = '';
      if (!trimmedName) {
        missingDetail = language === 'en' ? 'Your Name' : 'Jina Lako';
      } else if (!trimmedEmail) {
        missingDetail = language === 'en' ? 'Your Email Address' : 'Barua Pepe Yako';
      } else if (!trimmedText) {
        missingDetail = language === 'en' ? 'Your Message' : 'Ujumbe Wako';
      }

      const alertText = language === 'en'
        ? `Please provide all required sender details: ${missingDetail} is missing.`
        : `Tafadhali jaza taarifa zote zinazohitajika: ${missingDetail} haipo.`;

      setErrorMessage(alertText);
      if (setDbNotification) {
        setDbNotification({ type: 'error', message: alertText });
      } else {
        alert(alertText);
      }
      return;
    }

    // Email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      const alertText = language === 'en'
        ? 'Please provide a valid email address so the artist can reply to you.'
        : 'Tafadhali weka barua pepe sahihi ili msanii aweze kukujibu.';

      setErrorMessage(alertText);
      if (setDbNotification) {
        setDbNotification({ type: 'error', message: alertText });
      } else {
        alert(alertText);
      }
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    // Include Contact Info in Payload:
    // { senderName, senderEmail, senderUid: currentUser?.uid || 'guest', messageText, sentAt: serverTimestamp() }
    const effectiveUid = activeAuth?.uid || currentUser?.uid || userAccount?.uid || 'guest';

    const firestorePayload = {
      senderName: trimmedName,
      senderEmail: trimmedEmail,
      senderUid: effectiveUid,
      messageText: trimmedText,
      sentAt: serverTimestamp(),
      // Additional metadata for recipient matching & backward compatibility
      artistName: artistName || '',
      bookTitle: bookTitle || '',
      senderRole: senderRole || 'Student',
      message: trimmedText,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    try {
      if (db) {
        await addDoc(collection(db, 'direct_messages'), firestorePayload);
      }
    } catch (firestoreError) {
      console.warn("Firestore direct message notice:", firestoreError);
    }

    const createdDM: DirectMessage = {
      id: `dm-${Date.now()}`,
      artistName: artistName || '',
      bookTitle: bookTitle || '',
      senderName: trimmedName,
      senderRole: senderRole || 'Student',
      senderEmail: trimmedEmail,
      senderUid: effectiveUid,
      message: trimmedText,
      messageText: trimmedText,
      sentAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    if (onMessageSent) {
      onMessageSent(createdDM);
    }

    if (playChime) {
      playChime('sparkle');
    }

    if (setDbNotification) {
      setDbNotification({
        type: 'success',
        message: language === 'en'
          ? `💌 Message sent directly to artist "${artistName}"! They will receive your note.`
          : `💌 Ujumbe umetumwa kwa msanii "${artistName}"!`
      });
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-55 p-3 sm:p-4 select-none">
      <div
        className={`rounded-3xl border-4 w-[92vw] sm:w-[85vw] md:w-[480px] max-w-lg max-h-[92vh] flex flex-col shadow-2xl relative animate-scale-up overflow-hidden transition-colors duration-300 ${
          theme === 'night'
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-orange-300 text-slate-900'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (playChime) playChime('bubble');
          }}
          className={`absolute top-3.5 right-3.5 z-10 font-bold font-mono text-base cursor-pointer p-1.5 rounded-full transition ${
            theme === 'night'
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          aria-label="Close dialog"
        >
          ✕
        </button>

        {/* Modal Header (Fixed at top) */}
        <div className="text-center pt-5 px-5 sm:px-6 pb-2 shrink-0">
          <span className="text-3xl sm:text-4xl block">✉️</span>
          <h3
            className={`font-display font-bold text-base mt-1.5 ${
              theme === 'night' ? 'text-amber-300' : 'text-amber-955'
            }`}
          >
            {language === 'en' ? `Message Artist: ${artistName}` : `Ujumbe kwa Msanii: ${artistName}`}
          </h3>
          <p
            className={`text-[11px] mt-0.5 font-medium ${
              theme === 'night' ? 'text-slate-300' : 'text-amber-850'
            }`}
          >
            {bookTitle
              ? (language === 'en' ? `Regarding story: "${bookTitle}"` : `Kuhusu hadithi: "${bookTitle}"`)
              : (language === 'en'
                  ? "Send an encouraging message or question to the story creator!"
                  : "Tuma ujumbe wa pongezi au swali kwa mtunzi wa hadithi!")}
          </p>
        </div>

        {/* Form with Scrollable Body and Pinned Footer */}
        <form onSubmit={handleSendMessage} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Form Body with custom-scrollbar */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-2 space-y-3 custom-scrollbar text-left">
            {/* Sender Status Indicator Banner */}
            <div
              className={`p-2.5 rounded-2xl border text-[11px] flex items-center gap-2 ${
                isUserLoggedIn
                  ? theme === 'night'
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : theme === 'night'
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {isUserLoggedIn ? (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <div className="leading-snug">
                    <span className="font-bold">
                      {language === 'en' ? "Verified Account:" : "Akaunti Iliyothibitishwa:"}
                    </span>{' '}
                    <span className="truncate">{senderEmail || senderName || 'Logged In'}</span>
                  </div>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 shrink-0 text-amber-500" />
                  <div className="leading-snug">
                    <span className="font-bold">
                      {language === 'en' ? "Guest Identification Required:" : "Utambulisho wa Mgeni Unahitajika:"}
                    </span>{' '}
                    <span>
                      {language === 'en'
                        ? "Please provide your name and email so the artist can reply to you."
                        : "Tafadhali weka jina na barua pepe ili msanii aweze kukujibu."}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Error Alert Box */}
            {errorMessage && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Your Name field */}
            <div>
              <label
                className={`block text-[11px] font-display font-bold mb-1 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}
              >
                {language === 'en' ? "Your Name:" : "Jina Lako:"}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="senderName"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={language === 'en' ? "e.g. Alex Rivera" : "mfano Alex Rivera"}
                className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors ${
                  theme === 'night'
                    ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-400'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-orange-400'
                }`}
              />
            </div>

            {/* 2. Mandatory Email Field (Below 'Your Name') */}
            <div>
              <label
                className={`block text-[11px] font-display font-bold mb-1 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}
              >
                {language === 'en' ? "Your Email Address:" : "Barua Pepe Yako:"}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="senderEmail"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder={language === 'en' ? "e.g. yourname@example.com" : "mfano jinalako@example.com"}
                className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors ${
                  theme === 'night'
                    ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-400'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-orange-400'
                }`}
              />
            </div>

            {/* 3. Role selector */}
            <div>
              <label
                className={`block text-[11px] font-display font-bold mb-1 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}
              >
                {language === 'en' ? "Your Role / Perspective:" : "Wadhifa Wako:"}
              </label>
              <select
                value={senderRole}
                onChange={(e) => setSenderRole(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors ${
                  theme === 'night'
                    ? 'bg-slate-800 border border-slate-700 text-slate-100 focus:border-amber-400'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 focus:border-orange-400'
                }`}
              >
                <option value="Student" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>
                  {language === 'en' ? "Student / Child Reader" : "Mwanafunzi / Msomaji"}
                </option>
                <option value="Parent" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>
                  {language === 'en' ? "Parent / Guardian" : "Mzazi / Mlezi"}
                </option>
                <option value="Teacher" className={theme === 'night' ? 'bg-slate-800 text-slate-100' : ''}>
                  {language === 'en' ? "Teacher / Educator" : "Mwalimu"}
                </option>
              </select>
            </div>

            {/* 4. Message Text */}
            <div>
              <label
                className={`block text-[11px] font-display font-bold mb-1 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}
              >
                {language === 'en' ? "Your Message:" : "Ujumbe Wako:"}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="messageText"
                rows={3}
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={
                  language === 'en'
                    ? "Write a warm note, ask a question about the story, or share your thoughts..."
                    : "Andika ujumbe wa pongezi au uliza swali kuhusu hadithi..."
                }
                className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none font-sans resize-none transition-colors ${
                  theme === 'night'
                    ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-400'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-orange-400'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons (Pinned Footer) */}
          <div
            className={`shrink-0 px-5 sm:px-6 pt-3 pb-4 sm:pb-5 border-t flex gap-2.5 ${
              theme === 'night'
                ? 'bg-slate-900/95 border-slate-800'
                : 'bg-white/95 border-orange-100'
            }`}
          >
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                onClose();
                if (playChime) playChime('bubble');
              }}
              className={`flex-1 py-2.5 font-display font-semibold text-xs rounded-xl border transition cursor-pointer ${
                theme === 'night'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
            >
              {language === 'en' ? "Cancel" : "Ghairi"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-bold text-xs rounded-xl shadow border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer transition flex items-center justify-center gap-1.5 ${
                isSubmitting ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? (language === 'en' ? "Sending..." : "Inatuma...")
                  : (language === 'en' ? "Send Message 🚀" : "Tuma Ujumbe 🚀")}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendMessageModal;
