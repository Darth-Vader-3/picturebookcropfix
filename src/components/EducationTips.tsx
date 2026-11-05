import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { talkToMe, hushNow, playChime } from '../data';

interface EducationTipsProps {
  tipText: string;
  theme?: 'day' | 'night';
}

interface BuddyCharacter {
  id: string;
  name: string;
  avatar: string;
  greeting: string;
}

const BUDDIES: BuddyCharacter[] = [
  { id: 'clayton', name: 'Clayton Blob', avatar: '🧡', greeting: "Hi! I'm Clayton. I love sculpture." },
  { id: 'penny', name: 'Penny Crayon', avatar: '🖍️', greeting: "Hello! I'm Penny. I love coloring and watercolor washes!" },
  { id: 'marina', name: 'Marina Turtle', avatar: '🐢', greeting: "Hi, little artist! I'm Marina. Let's make felt papercuts." }
];

export default function EducationTips({ tipText, theme = 'day' }: EducationTipsProps) {
  const [selectedBuddyIdx, setSelectedBuddyIdx] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const currentBuddy = BUDDIES[selectedBuddyIdx];
  const isNight = theme === 'night';

  const handleSpeak = () => {
    if (isSpeaking) {
      hushNow();
      setIsSpeaking(false);
      return;
    }

    playChime('sparkle');
    setIsSpeaking(true);
    talkToMe(`${currentBuddy.name} says: ${tipText}`, () => {
      setIsSpeaking(false);
    });
  };

  const cycleBuddy = () => {
    hushNow();
    setIsSpeaking(false);
    playChime('pop');
    setSelectedBuddyIdx((prev) => (prev + 1) % BUDDIES.length);
  };

  const getBuddyColorClass = (buddyId: string) => {
    if (isNight) {
      switch (buddyId) {
        case 'clayton':
          return 'border-orange-700 bg-slate-900 text-slate-100';
        case 'penny':
          return 'border-emerald-700 bg-slate-900 text-slate-100';
        case 'marina':
        default:
          return 'border-cyan-700 bg-slate-900 text-slate-100';
      }
    } else {
      switch (buddyId) {
        case 'clayton':
          return 'border-orange-300 bg-orange-100 text-orange-950';
        case 'penny':
          return 'border-emerald-300 bg-emerald-100 text-emerald-950';
        case 'marina':
        default:
          return 'border-cyan-300 bg-cyan-100 text-cyan-950';
      }
    }
  };

  const buddyColor = getBuddyColorClass(currentBuddy.id);

  return (
    <div className={`p-4 rounded-3xl border-3 shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row gap-4 items-center md:items-start ${buddyColor}`}>
      
      {/* Sparkle background elements */}
      <div className="absolute top-1 right-2 opacity-10 text-xl pointer-events-none select-none">✨</div>
      <div className="absolute bottom-1 left-2 opacity-15 text-xl pointer-events-none select-none">🎨</div>

      {/* Buddy Left Column Avatar */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none">
        
        {/* Animated bounce avatar wrapper */}
        <div 
          onClick={cycleBuddy}
          className={`w-18 h-18 rounded-full border-4 flex items-center justify-center text-4xl shadow-inner cursor-pointer hover:rotate-12 transition transform active:scale-95 relative bg-white ${
            isSpeaking ? 'animate-bounce' : 'animate-pulse'
          }`}
          style={{ borderColor: 'rgba(0,0,0,0.1)' }}
          title={`Click to change Art Companion! Current: ${currentBuddy.name}`}
          id="buddy-avatar-click"
        >
          {currentBuddy.avatar}
          
          {/* Animated speaking dust */}
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 text-xs animate-ping">💬</span>
          )}
        </div>

        <button
          onClick={cycleBuddy}
          className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full border transition whitespace-nowrap cursor-pointer active:scale-95 text-center mt-1 ${
            isNight
              ? 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-750'
              : 'bg-white/80 hover:bg-white text-gray-800 border-black/10'
          }`}
          id="buddy-switch-button"
        >
          Switch Buddy 🔄
        </button>
      </div>

      {/* Right Column Tip Text */}
      <div className="flex-1 text-center md:text-left select-text">
        <div className="flex items-center justify-center md:justify-start gap-1.5 mb-1 select-none">
          <span className="font-display font-bold text-sm tracking-wide">
            {currentBuddy.name.toUpperCase()}'S ART TIP:
          </span>
          <span className="bg-yellow-400 text-yellow-950 text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" /> Learner Mode
          </span>
        </div>

        <p className={`font-sans text-xs md:text-sm leading-relaxed max-w-xl font-medium ${isNight ? 'text-slate-300' : 'text-inherit'}`}>
          "{tipText}"
        </p>

        {/* Read-To-Me interactive buttons inside buddy */}
        <div className="mt-3 flex items-center justify-center md:justify-start gap-2.5 select-none text-xs font-display">
          <button
            onClick={handleSpeak}
            className={`px-4 py-1.5 rounded-2xl font-bold flex items-center gap-1.5 shadow-sm border transition transform active:scale-95 cursor-pointer ${
              isSpeaking
                ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                : (isNight
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200')
            }`}
            id="buddy-read-aloud"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4" /> Stop Talking
              </>
            ) : (
              <>
                <Volume2 className={`w-4 h-4 ${isNight ? 'text-emerald-400' : 'text-emerald-600'}`} /> Read Aloud
              </>
            )}
          </button>
          
          <span className={`text-[10px] font-sans italic ${isNight ? 'text-slate-400' : 'opacity-60 text-inherit'}`}>
            {isSpeaking ? '🔊 Playing voice narration...' : '🔈 Click to hear me read!'}
          </span>
        </div>
      </div>

    </div>
  );
}
