import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Lock, Trash2 } from 'lucide-react';
import { playChime } from '../data';

interface LegalComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'sw';
  defaultTab?: 'terms' | 'rights';
  theme?: 'day' | 'night';
}

export const LegalComplianceModal: React.FC<LegalComplianceModalProps> = ({
  isOpen,
  onClose,
  language,
  defaultTab = 'terms',
  theme = 'day'
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'rights'>(defaultTab);
  const isNight = theme === 'night';

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in font-sans">
      <div className={`rounded-3xl border-4 w-[95vw] sm:w-[85vw] md:w-[65vw] max-w-2xl max-h-[88vh] flex flex-col shadow-2xl relative animate-scale-up overflow-hidden transition-colors duration-300 ${
        isNight ? 'bg-slate-900 border-amber-500 text-slate-100' : 'bg-white border-amber-300 text-gray-900'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between border-b-4 ${
          isNight
            ? 'bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 text-amber-200 border-amber-500'
            : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-amber-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              📜
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg tracking-wide">
                {language === 'en' ? 'Legal & Compliance Center' : 'Kituo cha Sheria & Usalama'}
              </h3>
              <p className={`text-[11px] font-medium ${isNight ? 'text-amber-300' : 'text-amber-100'}`}>
                {language === 'en'
                  ? 'Terms of Service, Community Standards & User Privacy Rights'
                  : 'Sera za Faragha, Vigezo vya Huduma na Haki za Mtumiaji'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              playChime('bubble');
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex border-b p-2 gap-1.5 overflow-x-auto select-none ${
          isNight ? 'bg-slate-950/70 border-slate-800' : 'bg-amber-50/50 border-orange-100'
        }`}>
          {[
            { id: 'terms', label: language === 'en' ? '📄 Terms of Service' : '📄 Sheria na Masharti', icon: FileText },
            { id: 'rights', label: language === 'en' ? '🛡️ Privacy & Rights' : '🛡️ Haki za Mtumiaji', icon: Lock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as 'terms' | 'rights');
                  playChime('pop');
                }}
                className={`py-2 px-3 flex items-center gap-1.5 font-display font-bold text-xs rounded-xl cursor-pointer transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? (isNight ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm')
                    : (isNight ? 'text-slate-300 hover:bg-slate-800' : 'text-amber-900 hover:bg-orange-100/60')
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className={`p-5 sm:p-6 flex-1 overflow-y-auto max-h-[60vh] text-left space-y-4 text-xs sm:text-sm leading-relaxed ${
          isNight ? 'text-slate-200' : 'text-gray-800'
        }`}>
          {/* TAB: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className={`font-display font-bold text-sm mb-1 ${isNight ? 'text-amber-300' : 'text-gray-900'}`}>1. Acceptance of Terms</h4>
                <p className={`text-xs ${isNight ? 'text-slate-300' : 'text-gray-700'}`}>
                  By accessing or using DigiPicture PictureBook Workbench and Reader, you agree to comply with these terms, community guidelines, and content moderation policies.
                </p>
              </div>

              <div>
                <h4 className={`font-display font-bold text-sm mb-1 ${isNight ? 'text-amber-300' : 'text-gray-900'}`}>2. Creator Content & Intellectual Property</h4>
                <p className={`text-xs ${isNight ? 'text-slate-300' : 'text-gray-700'}`}>
                  Artists retain full copyright and ownership of their original illustrations, stories, and audio narrations. By publishing to the public library, you grant DigiPicture a non-exclusive license to display the content to readers worldwide.
                </p>
              </div>

              <div>
                <h4 className={`font-display font-bold text-sm mb-1 ${isNight ? 'text-amber-300' : 'text-gray-900'}`}>3. Community Standards & Moderation</h4>
                <p className={`text-xs ${isNight ? 'text-slate-300' : 'text-gray-700'}`}>
                  All picture books must be child-safe and age-appropriate (3-12 years). Content depicting violence, hate speech, explicit themes, or copyright infringement will be promptly flagged, reviewed, and removed by administrators.
                </p>
              </div>

              <div>
                <h4 className={`font-display font-bold text-sm mb-1 ${isNight ? 'text-amber-300' : 'text-gray-900'}`}>4. Account Termination & Erasure</h4>
                <p className={`text-xs ${isNight ? 'text-slate-300' : 'text-gray-700'}`}>
                  Users may delete their account and associated books at any time via the Creator Studio settings. Account deletion immediately purges profile records from Firestore and client cache.
                </p>
              </div>
            </div>
          )}

          {/* TAB: PRIVACY & USER RIGHTS (GDPR/CCPA) */}
          {activeTab === 'rights' && (
            <div className="space-y-4 animate-fade-in">
              <div className={`p-4 border rounded-2xl ${
                isNight ? 'bg-slate-950 border-emerald-700/60 text-slate-200' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`flex items-center gap-2 font-display font-bold text-sm mb-1 ${
                  isNight ? 'text-emerald-300' : 'text-emerald-900'
                }`}>
                  <CheckCircle2 className={`w-4 h-4 ${isNight ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>GDPR & CCPA Rights Portal</span>
                </div>
                <p className={`text-xs ${isNight ? 'text-slate-300' : 'text-emerald-800'}`}>
                  You have full ownership of your data. Exercise your rights to data portability, access, and erasure anytime below.
                </p>
              </div>

              {/* Right to Erasure */}
              <div className={`p-4 border rounded-2xl ${
                isNight ? 'bg-slate-950 border-red-800/60 text-slate-200' : 'border-red-200 bg-red-50/40'
              }`}>
                <h5 className={`font-display font-bold text-xs mb-1 flex items-center gap-1.5 ${
                  isNight ? 'text-red-300' : 'text-red-900'
                }`}>
                  <Trash2 className={`w-4 h-4 ${isNight ? 'text-red-400' : 'text-red-600'}`} />
                  <span>Right to Erasure (Delete My Profile)</span>
                </h5>
                <p className={`text-xs leading-relaxed ${isNight ? 'text-slate-300' : 'text-red-800'}`}>
                  Artists and users can permanently delete their account, drawings, and authored books directly from the Creator Studio settings tab or by contacting moderation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-3.5 border-t flex items-center justify-between ${
          isNight ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'
        }`}>
          <span className={`text-[11px] font-medium ${isNight ? 'text-slate-400' : 'text-gray-500'}`}>
            DigiPicture Trust, Safety & Compliance Engine
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              playChime('pop');
            }}
            className={`py-2 px-5 font-display font-bold text-xs rounded-xl transition cursor-pointer ${
              isNight ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-gray-800 hover:bg-black text-white'
            }`}
          >
            {language === 'en' ? 'Close Window' : 'Funga'}
          </button>
        </div>
      </div>
    </div>
  );
};
