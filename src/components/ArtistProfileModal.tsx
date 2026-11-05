import React, { useEffect, useState } from 'react';
import { auth, fetchProfileFromFirestore } from '../firebase';
import { Mail, Phone, User, Tag, Palette, BookOpen, MessageSquare, X } from 'lucide-react';

export interface ArtistProfileData {
  uid?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  specialization?: string;
  bio?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  categories?: string[];
  booksCount?: number;
}

export interface ArtistProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName?: string;
  artistUid?: string;
  artistEmail?: string;
  booksCount?: number;
  onSendMessage?: (artistName: string) => void;
  theme: 'day' | 'night';
  language: string;
  playChime: (sound: any) => void;
}

export const ArtistProfileModal: React.FC<ArtistProfileModalProps> = ({
  isOpen,
  onClose,
  artistName = '',
  artistUid,
  artistEmail,
  booksCount = 0,
  onSendMessage,
  theme,
  language,
  playChime
}) => {
  const [profileData, setProfileData] = useState<ArtistProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const loadProfile = async () => {
      try {
        const currentUserUid = auth.currentUser?.uid;
        const currentUserEmail = auth.currentUser?.email?.toLowerCase();
        const currentUserName = auth.currentUser?.displayName?.toLowerCase();

        // Check if viewing current user's profile
        const isCurrentAuthUser = Boolean(
          currentUserUid && (
            (artistUid && artistUid === currentUserUid) ||
            (artistEmail && currentUserEmail && artistEmail.toLowerCase() === currentUserEmail) ||
            (artistName && currentUserName && artistName.toLowerCase() === currentUserName)
          )
        );

        // 1. Primary lookup by UID: use artistUid, or currentUserUid if viewing self
        const effectiveUid = artistUid || (isCurrentAuthUser ? currentUserUid : null) || (currentUserUid && !artistUid && !artistEmail ? currentUserUid : null);
        const effectiveEmail = artistEmail || (artistName.includes('@') ? artistName : undefined);

        // Fetch directly from Firestore (/users/{uid} and /artists/{uid} with email fallback)
        const firestoreProfile = await fetchProfileFromFirestore(effectiveUid, effectiveEmail);

        if (isMounted) {
          if (firestoreProfile) {
            setProfileData({
              uid: firestoreProfile.uid || effectiveUid || '',
              name: firestoreProfile.name || `${firestoreProfile.firstName || ''} ${firestoreProfile.lastName || ''}`.trim() || artistName || 'Artist',
              firstName: firestoreProfile.firstName || '',
              lastName: firestoreProfile.lastName || '',
              username: firestoreProfile.username || '',
              specialization: firestoreProfile.specialization || '',
              bio: firestoreProfile.bio || '',
              email: firestoreProfile.email || artistEmail || '',
              phone: firestoreProfile.phone || '',
              avatar: firestoreProfile.avatar || '🎨',
              categories: Array.isArray(firestoreProfile.categories) && firestoreProfile.categories.length > 0 
                ? firestoreProfile.categories 
                : ['Storybook Illustration'],
              booksCount: booksCount
            });
          } else {
            // Fallback object referencing whatever inputs are available
            setProfileData({
              uid: effectiveUid || '',
              name: artistName || 'Artist',
              username: '',
              specialization: '',
              bio: '',
              email: artistEmail || '',
              phone: '',
              avatar: '🎨',
              categories: ['Storybook Illustration'],
              booksCount: booksCount
            });
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("ArtistProfileModal: error fetching profile:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, artistName, artistUid, artistEmail, booksCount]);

  if (!isOpen || !profileData) return null;

  return (
    <div 
      id="artist-profile-modal-overlay" 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 select-none"
    >
      <div 
        id="artist-profile-modal-card"
        className={`rounded-3xl border-4 p-4 sm:p-5 w-[92vw] sm:w-[80vw] md:w-[460px] max-w-lg max-h-[88vh] md:max-h-[82vh] shadow-2xl relative animate-scale-up text-left flex flex-col transition-colors duration-300 overflow-hidden ${
          theme === 'night'
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-amber-300 text-slate-900'
        }`}
      >
        {/* Pinned Artist Header */}
        <div className={`flex items-center justify-between gap-3 border-b pb-3.5 shrink-0 transition-colors ${
          theme === 'night' ? 'border-slate-800' : 'border-orange-100'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl border-2 flex items-center justify-center text-2xl sm:text-3xl shadow-sm shrink-0 transition-colors ${
              theme === 'night'
                ? 'bg-slate-800 border-slate-700 text-amber-300'
                : 'bg-gradient-to-br from-amber-100 to-orange-200 border-orange-300'
            }`}>
              {profileData.avatar || '🎨'}
            </div>
            <div className="min-w-0">
              <h3 className={`font-display font-bold text-base sm:text-lg leading-tight truncate ${
                theme === 'night' ? 'text-amber-200' : 'text-amber-955'
              }`}>
                {profileData.name}
              </h3>
              <p className={`text-[11px] font-bold mt-0.5 flex items-center gap-1.5 ${
                theme === 'night' ? 'text-orange-300' : 'text-orange-700'
              }`}>
                <span>✨ Published Artist & Educator</span>
                <span className={theme === 'night' ? 'text-slate-600' : 'text-gray-300'}>•</span>
                <span>{profileData.booksCount} {profileData.booksCount === 1 ? 'Book' : 'Books'}</span>
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            id="artist-profile-modal-close-btn"
            type="button"
            onClick={() => { onClose(); playChime('bubble'); }}
            className={`font-bold font-mono text-base cursor-pointer p-1.5 rounded-xl transition shrink-0 ${
              theme === 'night' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-orange-50'
            }`}
            title="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body with smooth custom scrollbar */}
        <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar my-3 pr-1.5 space-y-3 ${
          theme === 'night' ? 'custom-scrollbar-night' : ''
        }`}>
          {/* Artist Bio Box - Referencing profileData.bio directly from Firestore */}
          <div className={`p-3.5 rounded-2xl border space-y-1 transition-colors ${
            theme === 'night'
              ? 'bg-slate-800/80 border-slate-700 text-slate-200'
              : 'bg-amber-50/70 border-orange-200/80 text-amber-900'
          }`}>
            <span className={`text-[10px] font-display font-extrabold uppercase tracking-wider block ${
              theme === 'night' ? 'text-amber-300' : 'text-amber-955'
            }`}>
              📜 Artist Bio
            </span>
            <p className={`text-xs font-medium leading-relaxed italic ${
              theme === 'night' ? 'text-slate-200' : 'text-amber-900'
            }`}>
              {profileData.bio ? `"${profileData.bio}"` : (
                <span className={theme === 'night' ? 'text-slate-400 not-italic' : 'text-gray-500 not-italic'}>
                  {language === 'en' ? 'No bio statement provided yet.' : 'Wasifu haujawekwa bado.'}
                </span>
              )}
            </p>
          </div>

          {/* Contact Information (Name, Username, Specialization, Email, Phone) */}
          <div className={`p-3.5 rounded-2xl border space-y-2 text-xs transition-colors ${
            theme === 'night'
              ? 'bg-slate-800/50 border-slate-700 text-slate-200'
              : 'bg-orange-50/50 border-orange-200/60 text-slate-800'
          }`}>
            <span className={`text-[10px] font-display font-extrabold uppercase tracking-wider block ${
              theme === 'night' ? 'text-amber-300' : 'text-amber-955'
            }`}>
              📞 Contact Information
            </span>

            <div className={`flex items-center justify-between p-2 rounded-xl border shadow-2xs transition-colors ${
              theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100'
            }`}>
              <span className={`font-bold flex items-center gap-1.5 ${
                theme === 'night' ? 'text-amber-300' : 'text-amber-955'
              }`}>
                <User className="w-3.5 h-3.5" />
                <span>Name:</span>
              </span>
              <span className={`font-semibold ${
                theme === 'night' ? 'text-slate-100' : 'text-gray-800'
              }`}>{profileData.name}</span>
            </div>

            {/* Username - referencing profileData.username directly from Firestore */}
            {profileData.username && (
              <div className={`flex items-center justify-between p-2 rounded-xl border shadow-2xs transition-colors ${
                theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}>
                  <Tag className="w-3.5 h-3.5" />
                  <span>Username:</span>
                </span>
                <span className={`font-semibold font-mono ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-900'
                }`}>
                  {profileData.username.startsWith('@') ? profileData.username : `@${profileData.username}`}
                </span>
              </div>
            )}

            {/* Specialization - referencing profileData.specialization directly from Firestore */}
            {profileData.specialization && (
              <div className={`flex items-center justify-between p-2 rounded-xl border shadow-2xs transition-colors ${
                theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}>
                  <Palette className="w-3.5 h-3.5" />
                  <span>Specialization:</span>
                </span>
                <span className={`font-semibold ${
                  theme === 'night' ? 'text-slate-100' : 'text-gray-800'
                }`}>{profileData.specialization}</span>
              </div>
            )}

            {profileData.email && (
              <div className={`flex items-center justify-between p-2 rounded-xl border shadow-2xs transition-colors ${
                theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email:</span>
                </span>
                <a
                  href={`mailto:${profileData.email}`}
                  className={`font-semibold hover:underline ${
                    theme === 'night' ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600'
                  }`}
                >
                  {profileData.email}
                </a>
              </div>
            )}

            {profileData.phone && (
              <div className={`flex items-center justify-between p-2 rounded-xl border shadow-2xs transition-colors ${
                theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${
                  theme === 'night' ? 'text-amber-300' : 'text-amber-955'
                }`}>
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone Number:</span>
                </span>
                <a
                  href={`tel:${profileData.phone}`}
                  className={`font-semibold hover:underline font-mono ${
                    theme === 'night' ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-700'
                  }`}
                >
                  {profileData.phone}
                </a>
              </div>
            )}
          </div>

          {/* Categories tags */}
          {profileData.categories && profileData.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {profileData.categories.map((cat, idx) => (
                <span key={idx} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  theme === 'night'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                    : 'bg-amber-100 text-amber-900 border-amber-200'
                }`}>
                  🎨 {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pinned Action Buttons */}
        <div className={`pt-3 border-t shrink-0 flex gap-2 transition-colors ${
          theme === 'night' ? 'border-slate-800' : 'border-orange-100'
        }`}>
          {onSendMessage && (
            <button
              id="artist-profile-modal-dm-btn"
              type="button"
              onClick={() => {
                onClose();
                onSendMessage(profileData.name);
              }}
              className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-display font-bold text-xs rounded-xl shadow border-b-3 border-amber-700 active:translate-y-0.5 active:border-b-0 cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{language === 'en' ? "Send Direct Message" : "Tuma Ujumbe"}</span>
            </button>
          )}
          <button
            id="artist-profile-modal-close-footer-btn"
            type="button"
            onClick={() => { onClose(); playChime('bubble'); }}
            className={`px-4 py-2.5 font-display font-bold text-xs rounded-xl border transition cursor-pointer ${
              theme === 'night'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
          >
            {language === 'en' ? "Close" : "Funga"}
          </button>
        </div>

      </div>
    </div>
  );
};
