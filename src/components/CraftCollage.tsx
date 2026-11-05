import React, { useState, useRef } from 'react';
import { CRAFT_PIECES, playChime } from '../data';
import { CraftPiece, PlacedCraftPiece } from '../types';
import { Scissors, Trash2, RotateCcw, Plus, Minus, Move, Check } from 'lucide-react';

interface CraftCollageProps {
  availablePieces?: CraftPiece[];
  backgroundTheme?: 'forest' | 'sky' | 'seabed' | 'garden';
  educationBuddyTip: string;
}

export default function CraftCollage({ availablePieces = [], backgroundTheme = 'garden', educationBuddyTip }: CraftCollageProps) {
  const [placedPieces, setPlacedPieces] = useState<PlacedCraftPiece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Use either custom page-assigned pieces or standard global pieces
  const piecesToUse = availablePieces.length > 0 ? availablePieces : CRAFT_PIECES;

  // Background style based on theme
  const getBackgroundStyles = () => {
    switch (backgroundTheme) {
      case 'seabed':
        return 'bg-gradient-to-b from-cyan-600 to-blue-900 border-blue-400';
      case 'sky':
        return 'bg-gradient-to-b from-sky-400 to-indigo-500 border-sky-300';
      case 'forest':
        return 'bg-gradient-to-b from-emerald-800 to-amber-950 border-emerald-500';
      case 'garden':
      default:
        return 'bg-gradient-to-b from-orange-100 to-amber-200 border-amber-300';
    }
  };

  // Add piece to stage
  const stampPiece = (piece: CraftPiece) => {
    playChime('wood');
    const newPlaced: PlacedCraftPiece = {
      id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      pieceId: piece.id,
      x: 35 + Math.random() * 30, // center areas
      y: 35 + Math.random() * 30,
      scale: 1.0,
      rotation: Math.floor(Math.random() * 30) - 15 // slight tilt
    };
    setPlacedPieces((prev) => [...prev, newPlaced]);
    setSelectedPieceId(newPlaced.id);
  };

  // Dragging logic
  const handlePieceDown = (e: React.MouseEvent | React.TouchEvent, placedId: string) => {
    e.stopPropagation();
    setSelectedPieceId(placedId);
    setIsDragging(true);
    playChime('pop');

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const piece = placedPieces.find((p) => p.id === placedId);
    if (piece && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const clickX_pct = ((clientX - rect.left) / rect.width) * 100;
      const clickY_pct = ((clientY - rect.top) / rect.height) * 100;

      // Distance from piece coordinate
      dragOffset.current = {
        x: clickX_pct - piece.x,
        y: clickY_pct - piece.y
      };
    }
  };

  const handleBoardMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !selectedPieceId || !boardRef.current) return;
    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = boardRef.current.getBoundingClientRect();
    const curX_pct = ((clientX - rect.left) / rect.width) * 100;
    const curY_pct = ((clientY - rect.top) / rect.height) * 100;

    setPlacedPieces((prev) =>
      prev.map((piece) => {
        if (piece.id === selectedPieceId) {
          // Clamp percentage within board bounds
          let targetX = curX_pct - dragOffset.current.x;
          let targetY = curY_pct - dragOffset.current.y;
          targetX = Math.max(5, Math.min(95, targetX));
          targetY = Math.max(5, Math.min(95, targetY));

          return { ...piece, x: targetX, y: targetY };
        }
        return piece;
      })
    );
  };

  const handleRelease = () => {
    setIsDragging(false);
  };

  // Adjust properties of selected piece
  const changeScale = (factor: number) => {
    if (!selectedPieceId) return;
    playChime('clay');
    setPlacedPieces((prev) =>
      prev.map((p) => {
        if (p.id === selectedPieceId) {
          const newScale = Math.max(0.4, Math.min(2.5, p.scale + factor));
          return { ...p, scale: parseFloat(newScale.toFixed(2)) };
        }
        return p;
      })
    );
  };

  const rotatePiece = () => {
    if (!selectedPieceId) return;
    playChime('wood');
    setPlacedPieces((prev) =>
      prev.map((p) => {
        if (p.id === selectedPieceId) {
          return { ...p, rotation: (p.rotation + 30) % 360 };
        }
        return p;
      })
    );
  };

  const removeSelectedPiece = () => {
    if (!selectedPieceId) return;
    playChime('bubble');
    setPlacedPieces((prev) => prev.filter((p) => p.id !== selectedPieceId));
    setSelectedPieceId(null);
  };

  const clearBoard = () => {
    playChime('bubble');
    setPlacedPieces([]);
    setSelectedPieceId(null);
  };

  return (
    <div className="flex flex-col h-full bg-amber-50/40 p-4 rounded-3xl border-4 border-amber-200 overflow-hidden relative">
      
      {/* Header controls: stamp indicators, trash everything */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 z-10 select-none">
        <div className="flex items-center gap-1">
          <Scissors className="w-5 h-5 text-amber-600 animate-pulse" />
          <span className="font-display font-medium text-sm text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            Crafting Table
          </span>
        </div>

        <button
          onClick={clearBoard}
          className="text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 px-3 py-1 rounded-xl font-display font-semibold transition active:scale-95"
          id="clear-collage-button"
        >
          Reset Scene (Clear)
        </button>
      </div>

      {/* Main Collage Stage */}
      <div
        ref={boardRef}
        onMouseMove={handleBoardMove}
        onMouseUp={handleRelease}
        onMouseLeave={handleRelease}
        onTouchMove={handleBoardMove}
        onTouchEnd={handleRelease}
        className={`relative flex-1 rounded-2xl border-2 border-dashed ${getBackgroundStyles()} overflow-hidden group shadow-lg flex items-center justify-center`}
        id="craft-board"
      >
        {/* Empty State Help Text */}
        {placedPieces.length === 0 && (
          <div className="absolute inset-4 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center p-6 text-white pointer-events-none select-none">
            <span className="text-4xl mb-2 animate-bounce">🎨</span>
            <p className="font-display font-bold text-lg">Your collage is empty!</p>
            <p className="text-xs text-white/80 max-w-xs mt-1.5 font-sans leading-relaxed">
              Tap the textured craft elements onto the board below. Then drag, scale, and rotate them to build your custom tapestry!
            </p>
          </div>
        )}

        {/* Coral Reef / Sea details or Forest decorations rendered background-wise using CSS shapes */}
        {backgroundTheme === 'garden' && (
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-emerald-600/30 rounded-t-full filter blur-xl pointer-events-none" />
        )}
        {backgroundTheme === 'forest' && (
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-amber-900/40 rounded-t-full filter blur-xl pointer-events-none" />
        )}

        {/* Placing elements */}
        {placedPieces.map((placed) => {
          const blueprint = CRAFT_PIECES.find((item) => item.id === placed.pieceId);
          if (!blueprint) return null;

          const isSelected = selectedPieceId === placed.id;

          return (
            <div
              key={placed.id}
              id={`placed-piece-${placed.id}`}
              onMouseDown={(e) => handlePieceDown(e, placed.id)}
              onTouchStart={(e) => handlePieceDown(e, placed.id)}
              className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow ${
                isSelected 
                  ? 'ring-4 ring-white ring-offset-2 ring-offset-amber-500 rounded-2xl z-40 scale-105' 
                  : 'hover:scale-103'
              }`}
              style={{
                left: `${placed.x}%`,
                top: `${placed.y}%`,
                transform: `translate(-50%, -50%) scale(${placed.scale}) rotate(${placed.rotation}deg)`,
                userSelect: 'none'
              }}
            >
              {/* Textured material frame matching physical felt cuts */}
              <div 
                className="w-16 h-16 flex items-center justify-center text-4xl p-2 relative rounded-2xl bg-white shadow-md border-2 border-dashed"
                style={{ borderColor: blueprint.color }}
              >
                {blueprint.emoji}
                
                {/* Physical stitch seams indicators in the margins to mimic fabric */}
                <div className="absolute inset-0.5 rounded-xl border border-dashed border-black/10 pointer-events-none" />
                
                {/* Small indicator label for kids */}
                <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-amber-950/90 text-[10px] text-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap min-w-full text-center hidden group-hover:block font-display leading-none">
                  {blueprint.type}
                </span>
              </div>

              {/* Floating controls specifically attached to the selected element */}
              {isSelected && !isDragging && (
                <div 
                  className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-amber-950/95 text-amber-50 px-2 py-1.5 rounded-xl flex items-center gap-2.5 shadow-xl border border-amber-800 pointer-events-auto z-50 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => changeScale(0.15)}
                    className="p-1 hover:bg-amber-800 rounded bg-amber-900"
                    title="Scale Up"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => changeScale(-0.15)}
                    className="p-1 hover:bg-amber-800 rounded bg-amber-900"
                    title="Scale Down"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={rotatePiece}
                    className="p-1 hover:bg-amber-800 rounded bg-amber-900"
                    title="Rotate Piece"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-amber-800" />
                  <button
                    onClick={removeSelectedPiece}
                    className="p-1 hover:bg-red-800 rounded bg-red-900 text-red-200"
                    title="Remove Piece"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedPieceId(null)}
                    className="p-1 hover:bg-emerald-800 rounded bg-emerald-900 text-emerald-200"
                    title="Done Editing"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Craft Material tray - contains the cards of physical assets */}
      <div className="mt-4 flex flex-col gap-2">
        <span className="text-xs font-display font-medium text-amber-900">
          ✂️ Tap items to stamp overlapping layers:
        </span>
        
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 pr-2 pt-1 select-none">
          {piecesToUse.map((piece) => (
            <button
              key={piece.id}
              id={`stamp-tool-${piece.id}`}
              onClick={() => stampPiece(piece)}
              className="flex flex-col items-center gap-1 p-2 bg-white rounded-2xl border-2 hover:border-amber-500 hover:shadow-md transition transform hover:-translate-y-1 active:translate-y-0 text-center min-w-[70px] flex-shrink-0 cursor-pointer text-xs"
              style={{ borderStyle: 'dashed', borderColor: piece.color }}
            >
              <span className="text-3xl">{piece.emoji}</span>
              <span className="text-[10px] font-display font-medium text-amber-950 truncate max-w-[65px] leading-tight">
                {piece.name}
              </span>
              <span className="bg-amber-100 text-[8px] text-amber-800 font-bold px-1.5 py-0.5 rounded-full capitalize leading-none">
                {piece.type}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
