import { PictureBook, SculptureModel, CraftPiece } from './types';

// Let's create gorgeous 3D models procedurally.
// Vertices are represented as { x, y, z }
// Faces are indices into vertices, and a color
export const SCULPTURE_MODELS: Record<string, SculptureModel> = {
  pot: {
    name: 'Clay Pot of Wishes',
    description: 'An ancient textured clay vase modeled with smooth curves. Drag to spin it!',
    defaultScale: 90,
    vertices: [
      // Base circle (Y = -1.5)
      { x: -0.6, y: -1.2, z: -0.6 }, { x: 0.6, y: -1.2, z: -0.6 }, { x: 0.6, y: -1.2, z: 0.6 }, { x: -0.6, y: -1.2, z: 0.6 },
      // Belly circle (Y = -0.4, bulging out)
      { x: -1.4, y: -0.4, z: -1.4 }, { x: 0, y: -0.4, z: -2.0 }, { x: 1.4, y: -0.4, z: -1.4 }, { x: 2.0, y: -0.4, z: 0 },
      { x: 1.4, y: -0.4, z: 1.4 }, { x: 0, y: -0.4, z: 2.0 }, { x: -1.4, y: -0.4, z: 1.4 }, { x: -2.0, y: -0.4, z: 0 },
      // Waist cylinder (Y = 0.4, narrowing)
      { x: -0.8, y: 0.4, z: -0.8 }, { x: 0, y: 0.4, z: -1.1 }, { x: 0.8, y: 0.4, z: -0.8 }, { x: 1.1, y: 0.4, z: 0 },
      { x: 0.8, y: 0.4, z: 0.8 }, { x: 0, y: 0.4, z: 1.1 }, { x: -0.8, y: 0.4, z: 0.8 }, { x: -1.1, y: 0.4, z: 0 },
      // Neck (Y = 1.0, very narrow)
      { x: -0.5, y: 1.0, z: -0.5 }, { x: 0, y: 1.0, z: -0.7 }, { x: 0.5, y: 1.0, z: -0.5 }, { x: 0.7, y: 1.0, z: 0 },
      { x: 0.5, y: 1.0, z: 0.5 }, { x: 0, y: 1.0, z: 0.7 }, { x: -0.5, y: 1.0, z: 0.5 }, { x: -0.7, y: 1.0, z: 0 },
      // Lip (Y = 1.4, flare out)
      { x: -0.9, y: 1.3, z: -0.9 }, { x: 0, y: 1.3, z: -1.3 }, { x: 0.9, y: 1.3, z: -0.9 }, { x: 1.3, y: 1.3, z: 0 },
      { x: 0.9, y: 1.3, z: 0.9 }, { x: 0, y: 1.3, z: 1.3 }, { x: -0.9, y: 1.3, z: 0.9 }, { x: -1.3, y: 1.3, z: 0 }
    ],
    faces: [
      // Base fill
      { indices: [0, 1, 2, 3], color: '#d97706' },
      
      // Bottom belly transition
      { indices: [0, 1, 5, 4], color: '#eab308' },
      { indices: [1, 2, 7, 6], color: '#d97706' },
      { indices: [2, 3, 9, 8], color: '#ca8a04' },
      { indices: [3, 0, 11, 10], color: '#b45309' },
      
      // Middle waist transition
      { indices: [4, 5, 13, 12], color: '#ea580c' },
      { indices: [5, 6, 14, 13], color: '#f97316' },
      { indices: [6, 7, 15, 14], color: '#ea580c' },
      { indices: [7, 8, 16, 15], color: '#c2410c' },
      { indices: [8, 9, 17, 16], color: '#f97316' },
      { indices: [9, 10, 18, 17], color: '#ea580c' },
      { indices: [10, 11, 19, 18], color: '#c2410c' },
      { indices: [11, 4, 12, 19], color: '#9a3412' },

      // Neck transition
      { indices: [12, 13, 21, 20], color: '#f59e0b' },
      { indices: [13, 14, 22, 21], color: '#eab308' },
      { indices: [14, 15, 23, 22], color: '#d97706' },
      { indices: [15, 16, 24, 23], color: '#ca8a04' },
      { indices: [16, 17, 25, 24], color: '#ea580c' },
      { indices: [17, 18, 26, 25], color: '#d97706' },
      { indices: [18, 19, 27, 26], color: '#b45309' },
      { indices: [19, 12, 20, 27], color: '#9a3412' },

      // Mouth flare transition
      { indices: [20, 21, 29, 28], color: '#fb923c' },
      { indices: [21, 22, 30, 29], color: '#f97316' },
      { indices: [22, 23, 31, 30], color: '#ea580c' },
      { indices: [23, 24, 32, 31], color: '#ca8a04' },
      { indices: [24, 25, 33, 32], color: '#fb923c' },
      { indices: [25, 26, 34, 33], color: '#f97316' },
      { indices: [26, 27, 35, 34], color: '#ea580c' },
      { indices: [27, 20, 28, 35], color: '#9a3412' }
    ]
  },
  gem: {
    name: 'Glittering Star Jewel',
    description: 'A multi-faceted geometrical gem that plays with light. Spin to see the sparkle angles!',
    defaultScale: 110,
    vertices: [
      { x: 0, y: 1.4, z: 0 },     // Top tip (0)
      { x: -1.1, y: 0, z: -1.1 },  // Middle girdle points (1-4)
      { x: 1.1, y: 0, z: -1.1 },
      { x: 1.1, y: 0, z: 1.1 },
      { x: -1.1, y: 0, z: 1.1 },
      { x: 0, y: -1.4, z: 0 }     // Bottom tip (5)
    ],
    faces: [
      // Top pyramid
      { indices: [0, 1, 2], color: '#38bdf8' },
      { indices: [0, 2, 3], color: '#0ea5e9' },
      { indices: [0, 3, 4], color: '#0284c7' },
      { indices: [0, 4, 1], color: '#7dd3fc' },
      // Bottom pyramid
      { indices: [5, 2, 1], color: '#0369a1' },
      { indices: [5, 3, 2], color: '#0284c7' },
      { indices: [5, 4, 3], color: '#0ea5e9' },
      { indices: [5, 1, 4], color: '#075985' }
    ]
  },
  dinosaur: {
    name: 'Playdog Toy',
    description: 'A cute handmade clay animal model like a little dog. Spin to see all sides!',
    defaultScale: 70,
    vertices: [
      // Body block (width 1.2, height 0.8, depth 1.8)
      { x: -0.5, y: -0.3, z: -0.9 }, // 0: BLB (Bottom Left Back)
      { x: 0.5, y: -0.3, z: -0.9 },  // 1: BRB
      { x: 0.5, y: 0.3, z: -0.9 },   // 2: TRB
      { x: -0.5, y: 0.3, z: -0.9 },  // 3: TLB
      { x: -0.5, y: -0.3, z: 0.7 },  // 4: BLF (Bottom Left Front)
      { x: 0.5, y: -0.3, z: 0.7 },   // 5: BRF
      { x: 0.5, y: 0.3, z: 0.7 },    // 6: TRF
      { x: -0.5, y: 0.3, z: 0.7 },   // 7: TLF
      
      // Neck & Head block (drawn above front of body)
      { x: -0.4, y: 0.3, z: 0.3 },   // 8
      { x: 0.4, y: 0.3, z: 0.3 },    // 9
      { x: 0.4, y: 1.0, z: 0.8 },    // 10: Head front-top right
      { x: -0.4, y: 1.0, z: 0.8 },   // 11: Head front-top left
      { x: -0.4, y: 1.0, z: 0.2 },   // 12: Head back-top left
      { x: 0.4, y: 1.0, z: 0.2 },    // 13: Head back-top right
      
      // Snout
      { x: -0.25, y: 0.6, z: 1.2 },  // 14
      { x: 0.25, y: 0.6, z: 1.2 },   // 15
      { x: 0.25, y: 0.9, z: 1.1 },   // 16
      { x: -0.25, y: 0.9, z: 1.1 }   // 17
    ],
    faces: [
      // Body box faces
      { indices: [0, 1, 2, 3], color: '#a16207' }, // Back
      { indices: [4, 5, 6, 7], color: '#d97706' }, // Front
      { indices: [0, 1, 5, 4], color: '#854d0e' }, // Bottom
      { indices: [3, 2, 6, 7], color: '#f59e0b' }, // Top
      { indices: [0, 3, 7, 4], color: '#ca8a04' }, // Left
      { indices: [1, 2, 6, 5], color: '#b45309' }, // Right
      
      // Neck-head faces
      { indices: [8, 9, 13, 12], color: '#d97706' },
      { indices: [10, 11, 12, 13], color: '#f59e0b' }, // Top of head
      { indices: [8, 11, 10, 9], color: '#eab308' },   // Front face of head
      { indices: [8, 12, 11, 7], color: '#ca8a04' },
      { indices: [9, 13, 10, 6], color: '#b45309' },
      
      // Snout faces
      { indices: [14, 15, 16, 17], color: '#000000' }, // Nose tip
      { indices: [17, 16, 10, 11], color: '#eab308' }
    ]
  },
  statue: {
    name: 'African Heritage Mask',
    description: 'A sculpted ceremonial woodcraft mask with geometric facial planes and brow engravings.',
    defaultScale: 95,
    vertices: [
      { x: 0, y: 1.6, z: 0 },      // Crown top (0)
      { x: -0.9, y: 1.0, z: -0.2 }, // Top left brow (1)
      { x: 0.9, y: 1.0, z: -0.2 },  // Top right brow (2)
      { x: -1.2, y: 0.1, z: 0.2 },  // Cheek left (3)
      { x: 1.2, y: 0.1, z: 0.2 },   // Cheek right (4)
      { x: 0, y: 0.2, z: 0.8 },     // Nose ridge peak (5)
      { x: -0.3, y: -0.4, z: 0.5 }, // Mouth left (6)
      { x: 0.3, y: -0.4, z: 0.5 },  // Mouth right (7)
      { x: 0, y: -1.5, z: 0.1 },    // Chin bottom (8)
      { x: 0, y: 0.8, z: 0.4 }      // Forehead center (9)
    ],
    faces: [
      { indices: [0, 1, 9], color: '#78350f' },
      { indices: [0, 9, 2], color: '#9a3412' },
      { indices: [1, 3, 5, 9], color: '#b45309' },
      { indices: [2, 9, 5, 4], color: '#d97706' },
      { indices: [3, 8, 6], color: '#92400e' },
      { indices: [4, 7, 8], color: '#854d0e' },
      { indices: [5, 6, 8, 7], color: '#ca8a04' },
      { indices: [3, 6, 5], color: '#a16207' },
      { indices: [4, 5, 7], color: '#b45309' }
    ]
  },
  giraffe: {
    name: 'Savanna Giraffe Figurine',
    description: 'A tall clay savanna giraffe model with an elongated neck, ossicones, and legs.',
    defaultScale: 60,
    vertices: [
      // Body box (0-7)
      { x: -0.4, y: -0.8, z: -0.6 }, { x: 0.4, y: -0.8, z: -0.6 },
      { x: 0.4, y: -0.2, z: -0.6 },  { x: -0.4, y: -0.2, z: -0.6 },
      { x: -0.4, y: -0.8, z: 0.6 },  { x: 0.4, y: -0.8, z: 0.6 },
      { x: 0.4, y: -0.2, z: 0.6 },   { x: -0.4, y: -0.2, z: 0.6 },
      // Long Neck (8-11)
      { x: -0.25, y: 1.6, z: 0.3 }, { x: 0.25, y: 1.6, z: 0.3 },
      { x: 0.25, y: 1.6, z: 0.7 },  { x: -0.25, y: 1.6, z: 0.7 },
      // Head & Ears (12-15)
      { x: -0.2, y: 1.9, z: 0.9 },  { x: 0.2, y: 1.9, z: 0.9 },
      { x: 0.15, y: 2.1, z: 0.5 },  { x: -0.15, y: 2.1, z: 0.5 },
      // Legs base points (16-19)
      { x: -0.3, y: -1.7, z: -0.5 }, { x: 0.3, y: -1.7, z: -0.5 },
      { x: -0.3, y: -1.7, z: 0.5 },  { x: 0.3, y: -1.7, z: 0.5 }
    ],
    faces: [
      // Torso
      { indices: [0, 1, 2, 3], color: '#d97706' },
      { indices: [4, 5, 6, 7], color: '#f59e0b' },
      { indices: [0, 4, 7, 3], color: '#b45309' },
      { indices: [1, 2, 6, 5], color: '#ca8a04' },
      // Neck tower
      { indices: [7, 6, 9, 8], color: '#fbbf24' },
      { indices: [6, 5, 10, 9], color: '#f59e0b' },
      { indices: [5, 4, 11, 10], color: '#d97706' },
      { indices: [4, 7, 8, 11], color: '#b45309' },
      // Head
      { indices: [8, 9, 13, 12], color: '#fef08a' },
      { indices: [12, 13, 14, 15], color: '#f59e0b' },
      // Legs pillar representation
      { indices: [0, 16, 17, 1], color: '#78350f' },
      { indices: [4, 18, 19, 5], color: '#92400e' }
    ]
  },
  pyramid: {
    name: 'Golden Sun Pyramid',
    description: 'An ancient Egyptian 3-tiered stepped pyramid capped with a shimmering golden capstone.',
    defaultScale: 100,
    vertices: [
      // Base layer (0-3)
      { x: -1.5, y: -1.0, z: -1.5 }, { x: 1.5, y: -1.0, z: -1.5 }, { x: 1.5, y: -1.0, z: 1.5 }, { x: -1.5, y: -1.0, z: 1.5 },
      // Tier 1 top (4-7)
      { x: -1.0, y: -0.3, z: -1.0 }, { x: 1.0, y: -0.3, z: -1.0 }, { x: 1.0, y: -0.3, z: 1.0 }, { x: -1.0, y: -0.3, z: 1.0 },
      // Tier 2 top (8-11)
      { x: -0.5, y: 0.4, z: -0.5 },  { x: 0.5, y: 0.4, z: -0.5 },  { x: 0.5, y: 0.4, z: 0.5 },  { x: -0.5, y: 0.4, z: 0.5 },
      // Capstone peak (12)
      { x: 0, y: 1.3, z: 0 }
    ],
    faces: [
      // Base slant faces
      { indices: [0, 1, 5, 4], color: '#d97706' },
      { indices: [1, 2, 6, 5], color: '#f59e0b' },
      { indices: [2, 3, 7, 6], color: '#b45309' },
      { indices: [3, 0, 4, 7], color: '#ca8a04' },
      // Tier 2 slant faces
      { indices: [4, 5, 9, 8], color: '#fbbf24' },
      { indices: [5, 6, 10, 9], color: '#f59e0b' },
      { indices: [6, 7, 11, 10], color: '#d97706' },
      { indices: [7, 4, 8, 11], color: '#b45309' },
      // Capstone golden pyramid top
      { indices: [8, 9, 12], color: '#fef08a' },
      { indices: [9, 10, 12], color: '#facc15' },
      { indices: [10, 11, 12], color: '#eab308' },
      { indices: [11, 8, 12], color: '#ca8a04' }
    ]
  },
  shield: {
    name: 'Warrior Ceremonial Shield',
    description: 'A traditional tribal shield crafted with curved wooden diamond planes and a brass center boss.',
    defaultScale: 90,
    vertices: [
      { x: 0, y: 1.7, z: 0 },      // Top spike (0)
      { x: -1.1, y: 0, z: -0.3 },  // Left wing (1)
      { x: 1.1, y: 0, z: -0.3 },   // Right wing (2)
      { x: 0, y: -1.7, z: 0 },     // Bottom tip (3)
      { x: 0, y: 0, z: 0.8 },      // Center boss peak (4)
      { x: -0.5, y: 0.6, z: 0.3 },  // Top left facet (5)
      { x: 0.5, y: 0.6, z: 0.3 },   // Top right facet (6)
      { x: -0.5, y: -0.6, z: 0.3 }, // Bottom left facet (7)
      { x: 0.5, y: -0.6, z: 0.3 }   // Bottom right facet (8)
    ],
    faces: [
      { indices: [0, 5, 4], color: '#dc2626' },
      { indices: [0, 4, 6], color: '#ef4444' },
      { indices: [0, 1, 5], color: '#b91c1c' },
      { indices: [0, 6, 2], color: '#991b1b' },
      { indices: [1, 7, 4, 5], color: '#ea580c' },
      { indices: [2, 6, 4, 8], color: '#d97706' },
      { indices: [1, 3, 7], color: '#ca8a04' },
      { indices: [2, 8, 3], color: '#b45309' },
      { indices: [4, 7, 3, 8], color: '#f59e0b' }
    ]
  },
  beetle: {
    name: 'Scarab Jewel Beetle',
    description: 'A iridescent clay scarab beetle with a dome shell, thorax segment, and legs.',
    defaultScale: 95,
    vertices: [
      { x: 0, y: 1.2, z: 0.4 },     // Head tip (0)
      { x: -0.5, y: 0.7, z: 0.5 },  // Thorax left (1)
      { x: 0.5, y: 0.7, z: 0.5 },   // Thorax right (2)
      { x: -1.0, y: -0.1, z: 0.6 }, // Shell mid left (3)
      { x: 1.0, y: -0.1, z: 0.6 },  // Shell mid right (4)
      { x: 0, y: 0, z: 1.2 },       // Shell high dome peak (5)
      { x: -0.6, y: -1.2, z: 0.3 }, // Shell rear left (6)
      { x: 0.6, y: -1.2, z: 0.3 },  // Shell rear right (7)
      { x: 0, y: -1.4, z: 0.1 }     // Tail tip (8)
    ],
    faces: [
      { indices: [0, 1, 2], color: '#0284c7' },
      { indices: [1, 3, 5, 2], color: '#0ea5e9' },
      { indices: [2, 5, 4], color: '#38bdf8' },
      { indices: [1, 5, 3], color: '#0284c7' },
      { indices: [3, 6, 8, 5], color: '#10b981' },
      { indices: [4, 5, 8, 7], color: '#059669' }
    ]
  }
};

// Craft collage initial components
export const CRAFT_PIECES: CraftPiece[] = [
  { id: 'cut-tree', type: 'papercut', name: 'Papercut Tree', emoji: '🌳', color: '#16a34a' },
  { id: 'felt-star', type: 'fabric', name: 'Felt Star', emoji: '⭐', color: '#facc15' },
  { id: 'clay-rabbit', type: 'clay', name: 'Clay Bunny', emoji: '🐇', color: '#f1f5f9' },
  { id: 'wooden-fence', type: 'collage', name: 'Twig Fence', emoji: '🪵', color: '#a16207' },
  { id: 'yarn-cloud', type: 'fabric', name: 'Yarn Cloud', emoji: '☁️', color: '#e2e8f0' },
  { id: 'clay-mushroom', type: 'clay', name: 'Clay Shroom', emoji: '🍄', color: '#ef4444' },
  { id: 'shell-snail', type: 'collage', name: 'Shell Snail', emoji: '🐚', color: '#f472b6' },
  { id: 'shiny-button', type: 'button', name: 'Gold Button', emoji: '🟡', color: '#fb923c' },
  { id: 'maple-leaf', type: 'leaf', name: 'Maple Leaf', emoji: '🍁', color: '#f97316' },
  { id: 'paper-sun', type: 'papercut', name: 'Origami Sun', emoji: '☀️', color: '#ea580c' },
  { id: 'clay-fish', type: 'clay', name: 'Clay Fish', emoji: '🐟', color: '#3b82f6' },
  { id: 'fabric-wave', type: 'fabric', name: 'Felt Wave', emoji: '🌊', color: '#60a5fa' }
];

// Initial preloaded picture books in our kids catalog (Default library cleared as requested)
export const INITIAL_BOOKS: PictureBook[] = [];

// Helper to vocalize text beautifully for kids!
export function talkToMe(text: string, onEnd?: () => void) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Cancel prior speech first
    window.speechSynthesis.cancel();
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose a friendly pitch and rate for kids
    utterance.pitch = 1.2;
    utterance.rate = 0.95;
    
    if (onEnd) {
      utterance.onend = onEnd;
    }
    
    window.speechSynthesis.speak(utterance);
  }
}

// Stop any talking
export function hushNow() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Sound effects synth (Web Audio API) for instant responsive feedback without audio assets
export function playChime(type: 'sparkle' | 'bubble' | 'wood' | 'clay' | 'pop') {
  if (typeof window === 'undefined') return;
  
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'sparkle') {
      // High glittering notes
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 0.4);
      });
    } else if (type === 'bubble') {
      // Rapid upward pitch sweeps
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'wood') {
      // Short wooden knocks
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.setValueAtTime(110, audioCtx.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'clay' || type === 'pop') {
      // Squishy spring bubble sound
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.quadraticRampToValueAtTime(220, audioCtx.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch (err) {
    // Fail silently in browsers blocking audio context init
  }
}

// Automated content moderation scanner for child-friendly environment
export function scanForInappropriateContent(text: string): { isFlagged: boolean; matchedWords: string[] } {
  if (!text) return { isFlagged: false, matchedWords: [] };
  
  const forbiddenPatterns = [
    'hate', 'kill', 'murder', 'blood', 'scam', 'violence', 'weapon',
    'profanity', 'explicit', 'nude', 'nsfw', 'porn', 'slur', 'terror',
    'stupid', 'dumb', 'ugly', 'die', 'death', 'idiot', 'drug', 'gambling'
  ];

  const lower = text.toLowerCase();
  const matched = forbiddenPatterns.filter((pattern) => {
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    return regex.test(lower);
  });

  return {
    isFlagged: matched.length > 0,
    matchedWords: matched
  };
}

// Calculate estimated reading time in minutes for a picture book
export function calculateReadingTimeMinutes(book: PictureBook): number {
  if (book.readingTimeMinutes && book.readingTimeMinutes > 0) {
    return book.readingTimeMinutes;
  }
  let totalWords = (book.description || '').split(/\s+/).filter(Boolean).length;
  if (book.pages) {
    book.pages.forEach((p) => {
      totalWords += (p.title || '').split(/\s+/).filter(Boolean).length;
      totalWords += (p.narrative || '').split(/\s+/).filter(Boolean).length;
      totalWords += (p.educationBuddyTip || '').split(/\s+/).filter(Boolean).length;
    });
  }
  const wordMinutes = Math.ceil(totalWords / 80);
  const pageMinutes = Math.ceil((book.pages?.length || 1) * 0.5);
  return Math.max(2, wordMinutes + pageMinutes);
}

// UI-level data masking for email addresses to prevent shoulder surfing
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts.slice(1).join('@');
  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}

