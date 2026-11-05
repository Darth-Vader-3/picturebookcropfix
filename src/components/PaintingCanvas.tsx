import React, { useRef, useState, useEffect } from 'react';
import { Palette, Trash2, Brush, Sparkles } from 'lucide-react';
import { playChime } from '../data';

interface PaintingCanvasProps {
  colors?: string[];
  textures?: { id: string; name: string; pattern: string; brushSize: number }[];
  educationBuddyTip: string;
}

export default function PaintingCanvas({ colors = [], textures = [], educationBuddyTip }: PaintingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentColor, setCurrentColor] = useState<string>(colors[0] || '#16a34a');
  const [brushType, setBrushType] = useState<string>('watercolor'); // watercolor, oil, sponge
  const [brushSize, setBrushSize] = useState<number>(30);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  
  // High fidelity preloaded outline sketches
  const [currentGuide, setCurrentGuide] = useState<'deer' | 'flower' | 'free'>('deer');

  // Load standard colors if empty
  const drawingColors = colors.length > 0 ? colors : ['#16a34a', '#eab308', '#2563eb', '#dc2626', '#d97706', '#9333ea', '#ec4899', '#1e293b'];

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      
      // Keep existing drawing when resizing by creating a temp canvas
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        // Fill canvas with plain white paper texture background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // Draw back the old painting
        ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Set up plain paper effect on load
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    playChime('bubble');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Canvas drawing handlers
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const drawPoint = (x: number, y: number, ctx: CanvasRenderingContext2D) => {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (brushType === 'watercolor') {
      // Semi-transparent overlay to look layered like watercolors
      ctx.strokeStyle = currentColor;
      ctx.shadowBlur = 4;
      ctx.shadowColor = currentColor;
      ctx.globalAlpha = 0.08; // multiple strokes blend translucent
      ctx.lineWidth = brushSize;
    } else if (brushType === 'oil') {
      // Solid heavy oil strokes with structural lines
      ctx.strokeStyle = currentColor;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brushSize;
      
      // Draw a secondary darker overlay stroke to simulate thick oil ridges
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 2);
      ctx.lineTo(x + 2, y + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = brushSize * 0.4;
      ctx.stroke();
      ctx.restore();
    } else if (brushType === 'sponge') {
      // Randomized spray splatters to copy sponge prints
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = currentColor;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 15; i++) {
        const offsetRadius = Math.random() * (brushSize / 2);
        const offsetAngle = Math.random() * Math.PI * 2;
        const ox = x + Math.cos(offsetAngle) * offsetRadius;
        const oy = y + Math.sin(offsetAngle) * offsetRadius;
        
        ctx.beginPath();
        ctx.arc(ox, oy, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    ctx.stroke();
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    drawPoint(pos.x, pos.y, ctx);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    drawPoint(pos.x, pos.y, ctx);
    ctx.moveTo(pos.x, pos.y);
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const changeBrushType = (b: string) => {
    setBrushType(b);
    playChime('clay');
    if (b === 'watercolor') setBrushSize(35);
    if (b === 'oil') setBrushSize(18);
    if (b === 'sponge') setBrushSize(40);
  };

  return (
    <div className="flex flex-col h-full bg-emerald-50/40 p-4 rounded-3xl border-4 border-emerald-200 overflow-hidden relative">
      
      {/* Top Controls: Brush tools, Outline guide switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 z-10">
        <div className="flex items-center gap-1 select-none">
          <Brush className="w-5 h-5 text-emerald-600 animate-pulse" />
          <span className="font-display font-medium text-sm text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
            Paint Workshop
          </span>
        </div>

        {/* Tracing Guide Selectors */}
        <div className="flex rounded-xl bg-emerald-100/70 p-1 border border-emerald-200 text-xs font-display select-none">
          <span className="text-emerald-800 self-center px-2 font-medium">Trace Guide:</span>
          <button
            onClick={() => { setCurrentGuide('deer'); playChime('pop'); }}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              currentGuide === 'deer' ? 'bg-emerald-600 text-white' : 'text-emerald-800 hover:bg-emerald-200/50'
            }`}
            id="guide-deer"
          >
            🦌 Deer
          </button>
          <button
            onClick={() => { setCurrentGuide('flower'); playChime('pop'); }}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              currentGuide === 'flower' ? 'bg-emerald-600 text-white' : 'text-emerald-800 hover:bg-emerald-200/50'
            }`}
            id="guide-flower"
          >
            🌸 Flower
          </button>
          <button
            onClick={() => { setCurrentGuide('free'); playChime('pop'); }}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              currentGuide === 'free' ? 'bg-emerald-600 text-white' : 'text-emerald-800 hover:bg-emerald-200/50'
            }`}
            id="guide-free"
          >
            ✏️ Free Hand
          </button>
        </div>
      </div>

      {/* Drawing Stage Wrapper */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-white rounded-2xl border-2 border-emerald-200 overflow-hidden group shadow-inner"
        id="painting-canvas-container"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={drawMove}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={drawMove}
          onTouchEnd={stopDraw}
          className="block w-full h-full cursor-crosshair touch-none"
        />

        {/* Tracing stencil overlay - acts as physical stencil guideline on canvas */}
        {currentGuide !== 'free' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 select-none">
            {currentGuide === 'deer' ? (
              <svg className="w-3/4 h-3/4 text-emerald-900" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Cute deer outline drawing */}
                <path d="M50,85 C55,85 57,80 57,75 L57,60 L62,55 C65,52 68,55 70,60 L73,75 C73,80 75,85 80,85" />
                <path d="M50,85 C45,85 43,80 43,75 L43,62" />
                <path d="M43,60 L36,55 C33,52 30,55 28,60 L25,75 C25,80 23,85 18,85" />
                <path d="M43,60 C43,48 48,45 57,45 L57,42" />
                <path d="M57,42 C62,42 66,35 66,28 C66,22 62,18 57,18 C52,18 48,22 48,28 C48,29 48,31 49,32 L47,38 L43,45" />
                {/* Antlers / Ears */}
                <path d="M57,18 C57,14 62,10 60,6 C58,10 57,14 57,18 Z" />
                <path d="M48,28 C46,24 40,24 40,18" />
                <path d="M53,18 L51,10 C49,7 46,10 48,15" />
                <circle cx="59" cy="24" r="1.5" fill="currentColor" />
                <path d="M64,28 Q62,30 65,32" strokeWidth="1.5" />
                {/* Cute spots */}
                <circle cx="28" cy="67" r="1" />
                <circle cx="31" cy="65" r="0.8" />
                <circle cx="68" cy="68" r="1" />
              </svg>
            ) : (
              <svg className="w-2/3 h-2/3 text-red-900" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Cute tulip flower outline */}
                <path d="M50,90 L50,45" strokeWidth="2.5" />
                <path d="M50,75 Q32,70 38,55 Q42,50 50,65" />
                <path d="M50,68 Q68,60 62,45 Q56,40 50,55" />
                {/* Petals */}
                <path d="M50,45 C35,45 35,20 50,12 C65,20 65,45 50,45 Z" fill="none" />
                <path d="M50,45 C42,42 42,22 50,12" />
                <path d="M50,45 C58,42 58,22 50,12" />
                <path d="M40,32 Q50,38 60,32" />
              </svg>
            )}
          </div>
        )}

        {/* Visual guide overlay banner */}
        <div className="absolute bottom-3 left-3 bg-white/95 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-1 text-xs select-none pointer-events-none text-emerald-800 font-display">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-spin-slow" />
          {currentGuide === 'free' ? 'Paint your own artwork here!' : 'Color the space to reveal the hidden art!'}
        </div>
      </div>

      {/* Bottom Tool shelf: Brushes, Size slider, Palette, Trash */}
      <div className="mt-4 flex flex-col gap-3.5 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
        
        {/* Row 1: Brush type selection and size slider */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-emerald-200">
            <button
              onClick={() => changeBrushType('watercolor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-medium flex items-center gap-1 ${
                brushType === 'watercolor'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
              id="brush-watercolor"
            >
              🌊 Watercolor
            </button>
            <button
              onClick={() => changeBrushType('oil')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-medium flex items-center gap-1 ${
                brushType === 'oil'
                  ? 'bg-amber-700 text-white shadow-sm font-semibold'
                  : 'text-amber-800 hover:bg-emerald-100/50'
              }`}
              id="brush-oil"
            >
              🎨 Thick Oil
            </button>
            <button
              onClick={() => changeBrushType('sponge')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-medium flex items-center gap-1 ${
                brushType === 'sponge'
                  ? 'bg-orange-500 text-white shadow-sm font-semibold'
                  : 'text-orange-800 hover:bg-emerald-100/50'
              }`}
              id="brush-sponge"
            >
              🧽 Sponge Stamp
            </button>
          </div>

          {/* Size slider */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-xs font-display font-semibold text-emerald-950 whitespace-nowrap">Size:</span>
            <input
              type="range"
              min="10"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="accent-emerald-600 w-full h-1.5 bg-emerald-200 rounded-full cursor-pointer"
              id="brush-size-slider"
            />
            <span className="text-xs font-mono font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 min-w-[32px] text-center">
              {brushSize}
            </span>
          </div>
        </div>

        {/* Row 2: Colorful Color Palette, Clear Canvas */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-emerald-100">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {drawingColors.map((color) => (
              <button
                key={color}
                id={`paint-color-${color.replace('#', '')}`}
                onClick={() => { setCurrentColor(color); playChime('clay'); }}
                className={`w-7.5 h-7.5 rounded-full border-2 transition-all transform hover:scale-115 active:scale-90 flex-shrink-0 ${
                  currentColor === color
                    ? 'border-emerald-800 ring-2 ring-emerald-300 ring-offset-1 scale-115'
                    : 'border-white shadow-sm'
                }`}
                style={{ backgroundColor: color }}
                title={`Paint ${color}`}
              />
            ))}
          </div>

          <button
            onClick={clearCanvas}
            className="px-3.5 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600 transition flex items-center gap-1.5 text-xs font-display font-semibold bg-white cursor-pointer active:scale-95"
            id="clear-canvas-button"
            title="Wipe canvas clear"
          >
            <Trash2 className="w-4 h-4" />
            Clear Paper
          </button>
        </div>

      </div>

    </div>
  );
}
