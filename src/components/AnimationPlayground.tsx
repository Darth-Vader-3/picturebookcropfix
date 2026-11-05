import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Wand2 } from 'lucide-react';
import { playChime } from '../data';

interface AnimatableElement {
  id: string;
  label: string;
  emoji: string;
  bounceType: string; // 'jump' | 'spin' | 'sway' | 'wiggle'
  x: number; // percent
  y: number; // percent
}

interface AnimationPlaygroundProps {
  animatableElements?: AnimatableElement[];
  educationBuddyTip: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  char: string;
  color: string;
}

export default function AnimationPlayground({ animatableElements = [], educationBuddyTip }: AnimationPlaygroundProps) {
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [particles, setParticles] = useState<Particle[]>([]);

  // Default elements
  const elements = animatableElements.length > 0 ? animatableElements : [
    { id: 'dog', label: 'Buddy", Clay Dog', emoji: '🐶', bounceType: 'wiggle', x: 50, y: 55 },
    { id: 'sun', label: 'Origami Sun', emoji: '☀️', bounceType: 'spin', x: 80, y: 15 },
    { id: 'flower1', label: 'Clay Tulip', emoji: '🌷', bounceType: 'sway', x: 20, y: 70 },
    { id: 'squirrel', label: 'Forest Squirrel', emoji: '🐿️', bounceType: 'jump', x: 75, y: 45 }
  ];

  const handleElementTap = (el: AnimatableElement, e: React.MouseEvent) => {
    setActiveElementId(el.id);
    setClickCounts(prev => ({ ...prev, [el.id]: (prev[el.id] || 0) + 1 }));
    
    // Choose synthy sound based on bounce type
    if (el.bounceType === 'jump') playChime('sparkle');
    if (el.bounceType === 'spin') playChime('bubble');
    if (el.bounceType === 'sway') playChime('wood');
    if (el.bounceType === 'wiggle') playChime('clay');

    // Generate burst particles at the click coordinates relative to the stage
    const rect = e.currentTarget.getBoundingClientRect();
    const stageRect = e.currentTarget.parentElement?.getBoundingClientRect();
    
    if (stageRect) {
      const clickX_pct = ((e.clientX - stageRect.left) / stageRect.width) * 100;
      const clickY_pct = ((e.clientY - stageRect.top) / stageRect.height) * 100;
      
      const starIcons = ['⭐', '✨', '🎈', '🫧', '🌸', '🟡'];
      const starColors = ['text-yellow-400', 'text-pink-400', 'text-cyan-400', 'text-amber-400', 'text-emerald-400'];
      
      const newParticles = Array.from({ length: 8 }).map((_, idx) => ({
        id: `particle-${Date.now()}-${idx}-${Math.random()}`,
        x: clickX_pct,
        y: clickY_pct - 5,
        char: starIcons[Math.floor(Math.random() * starIcons.length)],
        color: starColors[Math.floor(Math.random() * starColors.length)]
      }));

      setParticles(prev => [...prev, ...newParticles]);
      
      // Filter out old sparkles
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
      }, 1000);
    }

    // Reset active trigger shortly to allow consecutive presses
    setTimeout(() => {
      setActiveElementId(null);
    }, 450);
  };

  // Get Motion Variant properties for custom animation types
  const getAnimationVariants = (type: string) => {
    switch (type) {
      case 'jump':
        return {
          tap: { y: -80, scaleY: 1.15, transition: { type: 'spring', stiffness: 400, damping: 10 } }
        };
      case 'spin':
        return {
          tap: { rotate: 360, scale: 1.25, transition: { duration: 0.45, ease: 'easeInOut' } }
        };
      case 'sway':
        return {
          tap: { 
            rotate: [0, -25, 25, -15, 15, 0], 
            scale: 1.1,
            transition: { duration: 0.5, ease: 'easeInOut' } 
          }
        };
      case 'wiggle':
      default:
        return {
          tap: { 
            x: [0, -12, 12, -12, 12, 0], 
            scaleX: 1.2, 
            transition: { duration: 0.4, ease: 'easeOut' } 
          }
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-indigo-50/40 p-4 rounded-3xl border-4 border-indigo-200 overflow-hidden relative">
      
      {/* Top action indicator bar */}
      <div className="flex items-center justify-between mb-3 select-none">
        <div className="flex items-center gap-1">
          <Wand2 className="w-5 h-5 text-indigo-600 animate-pulse" />
          <span className="font-display font-medium text-sm text-indigo-900 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
            Puppet Theater
          </span>
        </div>
        <span className="text-xs font-display text-indigo-700 bg-white/80 border border-indigo-100 px-3 py-1 rounded-xl">
          Tap elements to bring them to life!
        </span>
      </div>

      {/* Play Stage */}
      <div 
        className="relative flex-1 bg-gradient-to-b from-sky-200 to-indigo-100 rounded-2xl border-2 border-indigo-200 overflow-hidden shadow-inner flex items-center justify-center select-none"
        id="animation-theatre-stage"
      >
        {/* Soft background decor (Fluffy sun cloud atmosphere) */}
        <div className="absolute top-8 left-12 w-28 h-8 bg-white/70 rounded-full filter blur-md animate-pulse" />
        <div className="absolute top-20 right-20 w-36 h-10 bg-white/60 rounded-full filter blur-md" style={{ animationDelay: '1s' }} />
        
        {/* Stage Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-indigo-300/40 to-transparent pointer-events-none" />

        {/* Particles / Sparkle bursts */}
        <AnimatePresence>
          {particles.map((p) => {
            // Random direction angles
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 40;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance - 60; // Bias upwards

            return (
              <motion.div
                key={p.id}
                initial={{ x: `${p.x}%`, y: `${p.y}%`, opacity: 1, scale: 0.5 }}
                animate={{
                  x: `calc(${p.x}% + ${dx}px)`,
                  y: `calc(${p.y}% + ${dy}px)`,
                  opacity: 0,
                  scale: 1.4,
                  rotate: Math.random() * 90 - 45
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="absolute text-xl pointer-events-none z-50 select-none font-display font-bold"
              >
                {p.char}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* The Animatable Characters puppets */}
        {elements.map((el) => {
          const isTapped = activeElementId === el.id;
          const bounceCount = clickCounts[el.id] || 0;
          const variants = getAnimationVariants(el.bounceType);

          return (
            <motion.div
              key={el.id}
              id={`puppet-${el.id}`}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              variants={variants as any}
              animate={isTapped ? 'tap' : 'initial'}
              whileHover={{ scale: 1.1, cursor: 'pointer' }}
              onClick={(e) => handleElementTap(el, e)}
              className="absolute group select-none flex flex-col items-center"
            >
              {/* Core character body and shadow */}
              <div className="relative">
                <span className="text-6xl drop-shadow-lg filter group-hover:brightness-105 active:scale-95 block transform transition-all duration-100">
                  {el.emoji}
                </span>

                {/* Animated micro floating shadow matching height of character */}
                <div className="w-10 h-2 bg-indigo-950/20 rounded-full mx-auto mt-2 filter blur-xs group-hover:scale-95 group-active:scale-110 transition-transform duration-200" />
              </div>

              {/* Tag Label with movement type for kids' educational vocabulary */}
              <span className="mt-1 bg-indigo-900/95 border border-indigo-700 text-white font-display text-[10px] px-2 py-0.5 rounded-full shadow opacity-80 group-hover:opacity-100 transition whitespace-nowrap">
                {el.label} ({el.bounceType.toUpperCase()}!)
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Tips panel on animations */}
      <div className="mt-4 p-3 bg-white rounded-2xl border border-indigo-100 flex items-center justify-between text-xs font-display">
        <div className="flex items-center gap-2 text-indigo-950">
          <span className="text-xl">🎭</span>
          <div>
            <p className="font-semibold text-indigo-900">How did the artist do this?</p>
            <p className="text-[11px] text-indigo-800 font-sans leading-none mt-0.5">
              They built pivots, springs, and rotators. Click repeatedly to compound the movements!
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
